param(
  [string]$Exe = "$env:TEMP\GlassTicker.exe",
  [string]$Out = "$env:TEMP\exe_icon.png"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Exe)) { Write-Output "missing: $Exe"; exit 1 }

$item = Get-Item $Exe
Write-Output ("exe: {0}  ({1:N1} MB)" -f $item.FullName, ($item.Length / 1MB))

$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Exe)
if ($null -eq $icon) { Write-Output "NO EMBEDDED ICON"; exit 2 }

Write-Output ("embedded icon: {0}x{1}" -f $icon.Width, $icon.Height)
$bitmap = $icon.ToBitmap()
$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$icon.Dispose()
Write-Output "saved $Out"

# Version info comes from the same rcedit pass that sets the icon.
$info = (Get-Item $Exe).VersionInfo
Write-Output ("product : {0}" -f $info.ProductName)
Write-Output ("company : {0}" -f $info.CompanyName)
Write-Output ("file ver: {0}" -f $info.FileVersion)
