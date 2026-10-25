$c = Get-Content "src/pages/Admin/EpidCodeAdminPage.tsx" -Raw
$idx = $c.IndexOf(");`")
while ($idx -ge 0) {
    $context = $c.Substring($idx, 30)
    Write-Host "Found at $idx: [$context]"
    $idx = $c.IndexOf(");", $idx + 1)
}