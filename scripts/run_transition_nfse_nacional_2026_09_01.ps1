$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$transition = Join-Path $PSScriptRoot "transition_nfse_nacional_2026_09_01.mjs"
$logFile = Join-Path $PSScriptRoot "transition_nfse_nacional_2026_09_01.log"

& "D:\Program Files\nodejs\node.exe" $transition *>> $logFile
exit $LASTEXITCODE
