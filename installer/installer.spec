# -*- mode: python -*-
import os
from pathlib import Path
from PyInstaller.building.build_main import Analysis, PYZ, EXE

block_cipher = None
root = Path(os.getcwd()).parent  # password-guardian/

a = Analysis(
    ['installer.py'],
    pathex=[],
    binaries=[],
    datas=[
        (str(root/'public'),       'extension-src/public'),
        (str(root/'public/src'),          'extension-src/src'),
        (str(root/'public/index.html'),   'extension-src'),
        (str(root/'package.json'), 'extension-src'),
        (str(root/'vite.config.js'),'extension-src'),
        (str(root/'public/model'),        'model')
    ],
    hiddenimports=[],
    noarchive=False
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(pyz, a.scripts, a.binaries, a.datas,
          name='PasswordGuardianInstaller',
          icon=None, console=True)