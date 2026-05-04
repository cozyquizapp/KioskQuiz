# normalize-sounds.ps1 — ffmpeg loudnorm fuer alle Sound-Slot-Files
# ─────────────────────────────────────────────────────────────────
# Audit 6 (2026-05-04, HANDOVER_NEXT.md TODO 3): Premium-Eindruck
# bricht binnen 60s wenn Sounds in Lautstaerke springen. Diese Skript
# normalisiert alle Files in frontend/public/sounds/ auf einheitliches
# LUFS-Level (SFX -16 LUFS, Loops -18 LUFS).
#
# Voraussetzung: ffmpeg im PATH. Test: `ffmpeg -version`
# Falls nicht installiert: choco install ffmpeg ODER scoop install ffmpeg
#
# Aufruf: pwsh ./scripts/normalize-sounds.ps1
# Optional: pwsh ./scripts/normalize-sounds.ps1 -DryRun
#          → zeigt was passieren wuerde, ohne Files zu schreiben.

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$soundsDir = Join-Path $PSScriptRoot "..\frontend\public\sounds"
$soundsDir = (Resolve-Path $soundsDir).Path

if (-not (Test-Path $soundsDir)) {
    Write-Error "Sound-Verzeichnis nicht gefunden: $soundsDir"
    exit 1
}

# ffmpeg-Check
try {
    $null = & ffmpeg -version 2>&1
} catch {
    Write-Error "ffmpeg nicht im PATH gefunden. Bitte installieren: scoop install ffmpeg"
    exit 1
}

# Loop-Files (laenger normalisieren auf -18 LUFS, ruhiger im Hintergrund).
# Alles andere = SFX, -16 LUFS (knackiger, hoerbar gegen Pub-Rauschen).
$LoopPatterns = @('*timer-loop*', '*lobby-welcome*', '*loop*', '*music*')

function Is-Loop($filename) {
    foreach ($pat in $LoopPatterns) {
        if ($filename -like $pat) { return $true }
    }
    return $false
}

$files = Get-ChildItem -Path $soundsDir -File | Where-Object {
    $_.Extension -match '\.(wav|mp3|ogg|m4a|flac)$'
}

if ($files.Count -eq 0) {
    Write-Host "Keine Audio-Files in $soundsDir gefunden."
    exit 0
}

Write-Host ""
Write-Host "Normalize-Sounds (ffmpeg loudnorm)" -ForegroundColor Cyan
Write-Host "Verzeichnis: $soundsDir"
Write-Host "Files: $($files.Count)"
if ($DryRun) { Write-Host "Modus: DRY-RUN (keine Aenderungen)" -ForegroundColor Yellow }
Write-Host ""

$tmpDir = Join-Path $env:TEMP "kioskquiz-norm-$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

try {
    foreach ($f in $files) {
        $isLoop = Is-Loop $f.Name
        $targetLufs = if ($isLoop) { -18 } else { -16 }
        $kind = if ($isLoop) { "LOOP" } else { "SFX " }
        $tmpOut = Join-Path $tmpDir $f.Name

        Write-Host "[$kind -$targetLufs LUFS] $($f.Name)" -ForegroundColor Green

        if ($DryRun) { continue }

        # Single-pass loudnorm (Two-Pass waere genauer, fuer Pub-SFX reicht 1-Pass).
        # I=Integrated-Target, TP=True-Peak-Limit, LRA=Loudness-Range.
        $args = @(
            '-y',                       # overwrite output
            '-i', $f.FullName,
            '-af', "loudnorm=I=$targetLufs:TP=-1.5:LRA=11",
            '-ar', '44100',             # samplerate 44.1kHz (Standard)
            '-ac', '2',                 # stereo
            $tmpOut
        )
        & ffmpeg @args 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "ffmpeg-Fehler bei $($f.Name) — uebersprungen."
            continue
        }
        # Backup das Original kurz, dann ersetzen.
        $backupPath = "$($f.FullName).bak"
        Move-Item -Path $f.FullName -Destination $backupPath -Force
        Move-Item -Path $tmpOut -Destination $f.FullName -Force
        Remove-Item -Path $backupPath -Force
    }

    Write-Host ""
    Write-Host "Fertig. Alle Files normalisiert." -ForegroundColor Cyan
    Write-Host "Test-Tipp: kurz im Browser laden + Lobby-Loop vs SFX vergleichen — kein Lautstaerke-Sprung."
} finally {
    Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}
