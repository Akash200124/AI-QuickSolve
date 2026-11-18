; ============================================================
; resources/installer/custom.nsh
; Custom NSIS script: install Python dependencies
; ============================================================

!macro customInstall
  DetailPrint "Installing Python dependencies..."
  ; Run pip install for bundled backend
  ExecWait '"$INSTDIR\resources\python\python.exe" -m pip install --no-index --find-links="$INSTDIR\resources\python\wheels" -r "$INSTDIR\resources\backend\requirements.txt"' $0
  DetailPrint "Python dependencies installed (exit code: $0)"
!macroend

!macro customUnInstall
  DetailPrint "Cleaning up..."
!macroend
