$ErrorActionPreference = "Stop"

$pptxPath = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\FileMind_Project_Presentation.pptx"
$pdfPath  = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\FileMind_Project_Presentation.pdf"
$slidesDir = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\presentation_assets\slide_previews"

if (-not (Test-Path $slidesDir)) {
    New-Item -ItemType Directory -Force -Path $slidesDir | Out-Null
}

Write-Host "Starting PowerPoint COM automation..."
$ppt = New-Object -ComObject PowerPoint.Application

try {
    Write-Host "Opening presentation: $pptxPath"
    $pres = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    
    # 1. Export PDF (2 = ppFixedFormatTypePDF)
    Write-Host "Exporting PDF to: $pdfPath"
    $pres.ExportAsFixedFormat($pdfPath, 2)
    Write-Host "PDF export complete!"

    # 2. Export individual slide images for inspection
    $slideCount = $pres.Slides.Count
    Write-Host "Exporting $slideCount slide images..."
    for ($i = 1; $i -le $slideCount; $i++) {
        $slide = $pres.Slides.Item($i)
        $slideImgPath = Join-Path $slidesDir ("slide_{0:D2}.png" -f $i)
        $slide.Export($slideImgPath, "PNG", 1920, 1080)
    }
    Write-Host "All slide images exported successfully!"

    $pres.Close()
}
finally {
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

Write-Host "Done! Verified deliverables:"
Get-Item $pptxPath, $pdfPath | Select-Object Name, Length, LastWriteTime
Get-ChildItem $slidesDir | Select-Object Name, Length
