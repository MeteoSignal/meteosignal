$ErrorActionPreference = "Stop"

function Get-FranceTimeZone {
    $timeZoneIds = @(
        "Europe/Paris",
        "Romance Standard Time"
    )

    foreach ($timeZoneId in $timeZoneIds) {
        try {
            return [System.TimeZoneInfo]::FindSystemTimeZoneById($timeZoneId)
        } catch {
            continue
        }
    }

    throw "Unable to find France time zone."
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$configPath = Join-Path $projectRoot "config\config.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$frenchCulture = [System.Globalization.CultureInfo]::GetCultureInfo("fr-FR")

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Config file not found: $configPath"
}

$timeZone = Get-FranceTimeZone
$parisNow = [System.TimeZoneInfo]::ConvertTimeFromUtc([System.DateTime]::UtcNow, $timeZone)
$buildDate = $parisNow.ToString("yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture)
$lastUpdated = $parisNow.ToString("dd MMMM yyyy", $frenchCulture)

$source = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)
$newline = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }

$buildPattern = '(\bbuild:\s*")[^"]+(")'
$buildEvaluator = [System.Text.RegularExpressions.MatchEvaluator]{
    param($match)

    return "$($match.Groups[1].Value)$buildDate$($match.Groups[2].Value)"
}

$updated = [System.Text.RegularExpressions.Regex]::Replace($source, $buildPattern, $buildEvaluator)

if ($updated -eq $source -and $source -notmatch $buildPattern) {
    throw "Unable to find build in config/config.js"
}

if ($updated -match '\blastUpdated:\s*"') {
    $lastUpdatedPattern = '(\blastUpdated:\s*")[^"]*(")'
    $lastUpdatedEvaluator = [System.Text.RegularExpressions.MatchEvaluator]{
        param($match)

        return "$($match.Groups[1].Value)$lastUpdated$($match.Groups[2].Value)"
    }

    $updated = [System.Text.RegularExpressions.Regex]::Replace($updated, $lastUpdatedPattern, $lastUpdatedEvaluator)
} else {
    $insertPattern = '(    build:\s*"[^"]+",\r?\n)'
    $insertEvaluator = [System.Text.RegularExpressions.MatchEvaluator]{
        param($match)

        return "$($match.Groups[1].Value)    lastUpdated: `"$lastUpdated`",$newline"
    }

    $updated = [System.Text.RegularExpressions.Regex]::Replace($updated, $insertPattern, $insertEvaluator, 1)
}

if ($updated -eq $source) {
    Write-Host "MeteoSignal build date already up to date."
} else {
    [System.IO.File]::WriteAllText($configPath, $updated, $utf8NoBom)
    Write-Host "MeteoSignal build date updated: $buildDate / $lastUpdated"
}
