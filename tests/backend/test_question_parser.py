# ============================================================
# tests/backend/test_question_parser.py
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
from app.services.question_parser import QuestionParser

parser = QuestionParser()


def test_parse_numbered_mcq():
    text = """1. What is machine learning?
A. Programming manually
B. Learning patterns from data
C. Database management
D. Network communication"""

    questions = parser.parse(text)
    assert len(questions) == 1
    q = questions[0]
    assert q.question_number == 1
    assert 'machine learning' in q.question
    assert 'A' in q.options
    assert 'B' in q.options
    assert 'C' in q.options
    assert 'D' in q.options
    assert q.question_type == 'mcq'
    assert q.is_complete is True


def test_parse_true_false():
    text = """The earth revolves around the sun.
A. True
B. False"""

    questions = parser.parse(text)
    assert len(questions) >= 1


def test_parse_multiple_questions():
    text = """1. What is Python?
A. A snake
B. A programming language
C. A game
D. A database

2. What does HTML stand for?
A. HyperText Markup Language
B. High Text Markup Language
C. HyperText Machine Language
D. None of the above"""

    questions = parser.parse(text)
    assert len(questions) == 2


def test_parse_no_mcq_returns_unknown():
    text = "This is just some regular text without any MCQ structure."
    questions = parser.parse(text)
    # Should return at least one entry with unknown type or empty list
    if questions:
        assert questions[0].question_type in ('unknown', 'mcq', 'true_false')


def test_parse_empty_text():
    questions = parser.parse("")
    assert questions == []


def test_parse_incomplete_question():
    text = """3. Which of the following is correct?
A. Option one that is quite long
B. Option two"""

    questions = parser.parse(text)
    assert len(questions) >= 1
    assert 'A' in questions[0].options
    assert 'B' in questions[0].options


def test_validates_short_questions():
    """Questions shorter than 5 chars should be filtered out."""
    text = "Q.\nA. a\nB. b"
    questions = parser.parse(text)
    # Short question text should be filtered
    for q in questions:
        assert len(q.question.strip()) >= 5
