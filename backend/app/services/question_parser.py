# ============================================================
# backend/app/services/question_parser.py
# Heuristic + regex MCQ parser
# ============================================================

import re
from typing import List, Dict, Optional
from loguru import logger
from schemas.scan_schema import ParsedQuestion


class QuestionParser:
    """
    Parses raw OCR text to extract structured MCQ data.
    
    Handles:
    - Numbered questions (1., Q1, Question 1)
    - Options A/B/C/D with various delimiters (. ) :)
    - True/False questions
    - Multi-line questions
    - Multiple questions per screen
    - Partial / incomplete questions
    """

    # ── Regex patterns ────────────────────────────────────────

    # Question starters: "1.", "Q1.", "Question 1:", etc.
    QUESTION_START = re.compile(
        r'^(?:Q(?:uestion)?\s*\.?\s*)?(\d+)[\.\):\s]+(.+)',
        re.IGNORECASE | re.MULTILINE
    )

    # Option patterns: A. | A) | A: | (A) | A -
    OPTION_PATTERN = re.compile(
        r'^[\(\[]?([A-Fa-f])[\.\)\]:\-]\s*(.+)',
        re.MULTILINE
    )

    # True/False pattern
    TRUE_FALSE_PATTERN = re.compile(
        r'\b(true|false)\b',
        re.IGNORECASE
    )

    # Numbered list detection (1. 2. 3.)
    NUMBERED_LINE = re.compile(r'^\d+[\.\)]\s+\S')

    def parse(self, text: str) -> List[ParsedQuestion]:
        """Main entry: parse raw text → list of ParsedQuestion."""
        if not text or not text.strip():
            return []

        lines = text.strip().splitlines()
        questions = []

        # Strategy 1: Try to find explicit question numbering
        numbered = self._parse_numbered_questions(lines)
        if numbered:
            questions.extend(numbered)
        else:
            # Strategy 2: Try to infer from option patterns
            inferred = self._parse_by_options(text)
            if inferred:
                questions.extend(inferred)

        # Deduplicate and validate
        questions = self._validate_questions(questions)

        logger.info(f"[Parser] Found {len(questions)} question(s)")
        return questions

    def _parse_numbered_questions(self, lines: List[str]) -> List[ParsedQuestion]:
        """Parse questions with explicit numbering."""
        questions = []
        current_question: Optional[Dict] = None

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Check if this is a new question
            q_match = self.QUESTION_START.match(stripped)
            opt_match = self.OPTION_PATTERN.match(stripped)

            if q_match and not opt_match:
                # Save previous question
                if current_question:
                    questions.append(self._finalize_question(current_question))

                current_question = {
                    'number': int(q_match.group(1)),
                    'text_lines': [q_match.group(2).strip()],
                    'options': {},
                    'type': 'mcq'
                }

            elif opt_match and current_question is not None:
                # This is an option for the current question
                label = opt_match.group(1).upper()
                option_text = opt_match.group(2).strip()
                current_question['options'][label] = option_text

            elif current_question is not None and not opt_match:
                # Continuation of question text (multi-line question)
                if not current_question['options']:
                    current_question['text_lines'].append(stripped)

        # Don't forget the last question
        if current_question:
            questions.append(self._finalize_question(current_question))

        return questions

    def _parse_by_options(self, text: str) -> List[ParsedQuestion]:
        """
        When there's no question numbering, try to find MCQs by
        looking for option blocks (A. B. C. D.) and working backwards
        to find the question text above them.
        """
        lines = text.splitlines()
        questions = []

        # Find lines with options
        option_indices = []
        for i, line in enumerate(lines):
            if self.OPTION_PATTERN.match(line.strip()):
                option_indices.append(i)

        if not option_indices:
            # No options found — check for True/False
            if self.TRUE_FALSE_PATTERN.search(text):
                q = ParsedQuestion(
                    question=text.strip()[:500],
                    options={'A': 'True', 'B': 'False'},
                    question_type='true_false',
                    is_complete=True,
                    raw_text=text[:500]
                )
                return [q]
            # Return raw text as unknown question
            q = ParsedQuestion(
                question=text.strip()[:500],
                options={},
                question_type='unknown',
                is_complete=False,
                raw_text=text[:500]
            )
            return [q]

        # Group consecutive option lines into blocks
        blocks = self._group_option_blocks(option_indices)

        for block_start, block_end in blocks:
            # Extract options
            options = {}
            for i in range(block_start, block_end + 1):
                m = self.OPTION_PATTERN.match(lines[i].strip())
                if m:
                    options[m.group(1).upper()] = m.group(2).strip()

            # Find question text above this block
            question_lines = []
            for i in range(block_start - 1, max(-1, block_start - 10), -1):
                stripped = lines[i].strip()
                if stripped and not self.OPTION_PATTERN.match(stripped):
                    question_lines.insert(0, stripped)
                elif not stripped and question_lines:
                    break

            question_text = ' '.join(question_lines).strip()

            if question_text or options:
                q = ParsedQuestion(
                    question=question_text if question_text else "Question text unclear",
                    options=options,
                    question_type='mcq' if len(options) >= 2 else 'unknown',
                    is_complete=bool(question_text and len(options) >= 2),
                    raw_text='\n'.join(lines[max(0, block_start - 5):block_end + 1])
                )
                questions.append(q)

        return questions

    def _group_option_blocks(
        self, indices: List[int]
    ) -> List[tuple]:
        """Group option line indices into contiguous blocks."""
        if not indices:
            return []

        blocks = []
        start = indices[0]
        prev = indices[0]

        for idx in indices[1:]:
            if idx - prev <= 2:  # allow blank lines between options
                prev = idx
            else:
                blocks.append((start, prev))
                start = idx
                prev = idx

        blocks.append((start, prev))
        return blocks

    def _finalize_question(self, raw: Dict) -> ParsedQuestion:
        """Convert raw parsed dict to ParsedQuestion."""
        question_text = ' '.join(raw['text_lines']).strip()

        # Check for True/False type
        q_type = raw.get('type', 'mcq')
        if not raw['options'] and self.TRUE_FALSE_PATTERN.search(question_text):
            raw['options'] = {'A': 'True', 'B': 'False'}
            q_type = 'true_false'

        return ParsedQuestion(
            question_number=raw.get('number'),
            question=question_text,
            options=raw['options'],
            question_type=q_type,
            is_complete=bool(question_text and len(raw['options']) >= 2),
            raw_text=question_text
        )

    def _validate_questions(self, questions: List[ParsedQuestion]) -> List[ParsedQuestion]:
        """Remove clearly invalid questions."""
        valid = []
        for q in questions:
            if len(q.question.strip()) < 5:
                continue
            valid.append(q)
        return valid
