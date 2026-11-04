param([string]$Date = (Get-Date -Format 'yyyy-MM-dd'))

$ErrorActionPreference = 'Stop'
$source = 'https://portal.uit.edu.vn/lich-phong'
$roomsById = @{}
$counts = [ordered]@{}

# These tab codes are published by the portal's room-calendar client.
foreach ($group in @('A', 'B', 'C', 'E', 'SAN_TAP', 'PH')) {
    $url = $source + '?view=compact&building=' + $group + '&date=' + [uri]::EscapeDataString($Date)
    $html = (Invoke-WebRequest -Uri $url -TimeoutSec 30).Content
    $found = $false
    foreach ($frame in [regex]::Matches($html, '<script>self\.__next_f\.push\((\[.*?\])\)</script>')) {
        # Decode JSON only; never evaluate script from the remote page.
        $parts = ConvertFrom-Json -InputObject $frame.Groups[1].Value
        if ($parts.Count -lt 2 -or $parts[1] -isnot [string] -or -not $parts[1].Contains('initialData')) { continue }
        $payload = $parts[1]
        $component = ConvertFrom-Json -InputObject $payload.Substring($payload.IndexOf(':') + 1)
        $rooms = @($component[3].initialData.rooms)
        if ($rooms.Count -eq 0) { throw "Missing room catalog for tab $group. Snapshot was not replaced." }
        $counts[$group] = $rooms.Count
        foreach ($room in $rooms) {
            if (-not $room.id -or -not $room.code -or -not $room.place_name) { throw "Invalid room in tab $group" }
            $entry = $room | Select-Object id, code, name, capacity, floor, room_type_code, place_name
            $key = [string]$room.id
            if ($roomsById.ContainsKey($key)) {
                if (($roomsById[$key] | ConvertTo-Json -Compress) -ne ($entry | ConvertTo-Json -Compress)) {
                    throw "Conflicting room metadata for portal ID $key. Retry after the portal finishes refreshing."
                }
            }
            $roomsById[$key] = $entry
        }
        $found = $true
    }
    if (-not $found) { throw "Portal data format changed for tab $group. Snapshot was not replaced." }
}

$snapshot = [ordered]@{
    source = $source
    retrievedOn = Get-Date -Format 'yyyy-MM-dd'
    groupCounts = $counts
    rooms = @($roomsById.Values | Sort-Object place_name, code)
}
# Retain only room metadata, never bookings, attendees, schedules or auth data.
$snapshot | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'uit-rooms.json') -Encoding utf8
Write-Output ('Saved ' + $snapshot.rooms.Count + ' unique rooms from ' + $source)
