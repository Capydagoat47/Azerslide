[CmdletBinding()]
param(
    [string]$Subject,
    [string]$Grade,
    [ValidateSet(3, 5, 7)]
    [int]$ButtonCount,
    [string[]]$ButtonNames,
    [string]$OutputPath,
    [switch]$NoOpen,
    [switch]$Gui
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ppLayoutBlank = 12
$ppMouseClick = 1
$ppActionHyperlink = 7
$ppSaveAsOpenXMLPresentation = 24
$msoTextOrientationHorizontal = 1
$msoShapeRectangle = 1
$msoShapeRoundedRectangle = 5
$msoShapeOval = 9

function Get-NormalizedText {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    return (($Text -replace "\s+", " ").Trim()).ToLowerInvariant()
}

function Get-CurriculumSubjects {
    return @(
        "AzÉ™rbaycan dili",
        "Riyaziyyat",
        "HÉ™yat bilgisi",
        "Ä°ngilis dili",
        "Rus dili",
        "Ä°nformatika",
        "Musiqi",
        "TÉ™sviri incÉ™sÉ™nÉ™t",
        "Fiziki tÉ™rbiyÉ™",
        "Tarix",
        "CoÄŸrafiya",
        "Biologiya",
        "Kimya",
        "Fizika"
    )
}

function Get-CanonicalSubject {
    param([string]$RawSubject)

    $normalized = Get-NormalizedText $RawSubject
    $matched = Get-CurriculumSubjects | Where-Object { (Get-NormalizedText $_) -eq $normalized } | Select-Object -First 1

    if ($matched) {
        return $matched
    }

    if ($null -eq $RawSubject) {
        return ""
    }

    return $RawSubject.Trim()
}

function Get-SubjectSuggestions {
    param([string]$RawSubject)

    $normalized = Get-NormalizedText $RawSubject

    switch ($normalized) {
        "azÉ™rbaycan dili" {
            return @(
                "DÉ™rslik",
                "Motivasiya",
                "SÃ¶z BoÄŸÃ§asÄ±",
                "DinlÉ™yib anlama",
                "Oxuyub anlama",
                "Refleksiya",
                "Oyun"
            )
        }
        "riyaziyyat" {
            return @(
                "DÉ™rslik",
                "Motivasiya",
                "MÉ™sÉ™lÉ™ hÉ™lli",
                "Ä°ÅŸ dÉ™ftÉ™ri",
                "Refleksiya",
                "Oyun"
            )
        }
        "iÌ‡ngilis dili" { return @("Vocabulary", "Reading", "Listening", "Speaking", "Practice", "Game") }
        "ingilis dili" { return @("Vocabulary", "Reading", "Listening", "Speaking", "Practice", "Game") }
        "rus dili" { return @("Vocabulary", "Reading", "Listening", "Speaking", "Practice", "Game") }
        default {
            return @(
                "DÉ™rslik",
                "Motivasiya",
                "TapÅŸÄ±rÄ±q",
                "Refleksiya",
                "Oyun"
            )
        }
    }
}

function Get-GradeNumber {
    param([string]$GradeText)

    if ([string]::IsNullOrWhiteSpace($GradeText)) {
        return $null
    }

    $match = [regex]::Match($GradeText, "\d+")
    if ($match.Success) {
        return [int]$match.Value
    }

    return $null
}

function Get-ThemeConfig {
    param([string]$GradeText)

    $gradeNumber = Get-GradeNumber $GradeText
    $isKidsTheme = $false

    if ($null -ne $gradeNumber -and $gradeNumber -ge 1 -and $gradeNumber -le 4) {
        $isKidsTheme = $true
    }

    if ($isKidsTheme) {
        return @{
            IsKids = $true
            TitleFont = "Arial Rounded MT Bold"
            BodyFont = "Calibri"
            Background = "#FFF6D8"
            Accent = "#FF8A3D"
            AccentTwo = "#57B7E5"
            AccentThree = "#7AC74F"
            AccentFour = "#FFD166"
            AccentText = "#20435C"
            ButtonText = "#FFFFFF"
            Subtle = "#FFFDF6"
            Footer = "#FFEFBC"
            Note = "#FFFFFF"
            NoteText = "#304A59"
            ModeLabel = "1-4-cÃ¼ sinif Ã¼Ã§Ã¼n daha rÉ™ngli vÉ™ uÅŸaqyÃ¶nlÃ¼ dizayn"
        }
    }

    return @{
        IsKids = $false
        TitleFont = "Aptos Display"
        BodyFont = "Aptos"
        Background = "#F4F6FA"
        Accent = "#2D5B87"
        AccentTwo = "#4E9B8E"
        AccentThree = "#D98E3D"
        AccentFour = "#DEE6F0"
        AccentText = "#17324D"
        ButtonText = "#FFFFFF"
        Subtle = "#FFFFFF"
        Footer = "#E9EEF5"
        Note = "#FFFFFF"
        NoteText = "#30404F"
        ModeLabel = "5-ci sinif vÉ™ yuxarÄ± Ã¼Ã§Ã¼n daha sÉ™liqÉ™li vÉ™ yÃ¼ngÃ¼l dinamik dizayn"
    }
}

function Convert-HtmlColorToOfficeRgb {
    param([string]$HtmlColor)

    $color = [System.Drawing.ColorTranslator]::FromHtml($HtmlColor)
    return [int]($color.R + ($color.G -shl 8) + ($color.B -shl 16))
}

function Set-ShapeFill {
    param(
        [Parameter(Mandatory)]
        $Shape,
        [Parameter(Mandatory)]
        [string]$HtmlColor
    )

    $Shape.Fill.Visible = -1
    $Shape.Fill.ForeColor.RGB = Convert-HtmlColorToOfficeRgb $HtmlColor
    $Shape.Fill.Solid()
}

function Set-ShapeLine {
    param(
        [Parameter(Mandatory)]
        $Shape,
        [Parameter(Mandatory)]
        [string]$HtmlColor,
        [double]$Weight = 1
    )

    $Shape.Line.Visible = -1
    $Shape.Line.ForeColor.RGB = Convert-HtmlColorToOfficeRgb $HtmlColor
    $Shape.Line.Weight = $Weight
}

function Set-TextStyle {
    param(
        [Parameter(Mandatory)]
        $Shape,
        [Parameter(Mandatory)]
        [string]$Text,
        [Parameter(Mandatory)]
        [string]$FontName,
        [Parameter(Mandatory)]
        [double]$FontSize,
        [Parameter(Mandatory)]
        [string]$HtmlColor,
        [int]$Alignment = 1,
        [switch]$Bold
    )

    $Shape.TextFrame.TextRange.Text = $Text
    $Shape.TextFrame.TextRange.Font.Name = $FontName
    $Shape.TextFrame.TextRange.Font.Size = $FontSize
    $Shape.TextFrame.TextRange.Font.Bold = $(if ($Bold) { -1 } else { 0 })
    $Shape.TextFrame.TextRange.Font.Color.RGB = Convert-HtmlColorToOfficeRgb $HtmlColor
    $Shape.TextFrame.TextRange.ParagraphFormat.Alignment = $Alignment
    $Shape.TextFrame.MarginLeft = 10
    $Shape.TextFrame.MarginRight = 10
    $Shape.TextFrame.MarginTop = 6
    $Shape.TextFrame.MarginBottom = 6
}

function Add-BackgroundLayer {
    param(
        [Parameter(Mandatory)]
        $Slide,
        [Parameter(Mandatory)]
        [hashtable]$Theme,
        [Parameter(Mandatory)]
        [double]$SlideWidth,
        [Parameter(Mandatory)]
        [double]$SlideHeight
    )

    $background = $Slide.Shapes.AddShape($msoShapeRectangle, 0, 0, $SlideWidth, $SlideHeight)
    Set-ShapeFill -Shape $background -HtmlColor $Theme.Background
    $background.Line.Visible = 0

    if ($Theme.IsKids) {
        $blobOne = $Slide.Shapes.AddShape($msoShapeOval, -20, 420, 190, 190)
        Set-ShapeFill -Shape $blobOne -HtmlColor $Theme.AccentFour
        $blobOne.Line.Visible = 0

        $blobTwo = $Slide.Shapes.AddShape($msoShapeOval, 720, -10, 210, 210)
        Set-ShapeFill -Shape $blobTwo -HtmlColor $Theme.AccentTwo
        $blobTwo.Line.Visible = 0
        $blobTwo.Fill.Transparency = 0.18

        $blobThree = $Slide.Shapes.AddShape($msoShapeOval, 580, 430, 160, 160)
        Set-ShapeFill -Shape $blobThree -HtmlColor $Theme.AccentThree
        $blobThree.Line.Visible = 0
        $blobThree.Fill.Transparency = 0.1
    }
    else {
        $bandTop = $Slide.Shapes.AddShape($msoShapeRectangle, 0, 0, $SlideWidth, 54)
        Set-ShapeFill -Shape $bandTop -HtmlColor $Theme.Accent
        $bandTop.Line.Visible = 0

        $bandSide = $Slide.Shapes.AddShape($msoShapeRectangle, 760, 0, 200, $SlideHeight)
        Set-ShapeFill -Shape $bandSide -HtmlColor $Theme.AccentFour
        $bandSide.Line.Visible = 0

        $disc = $Slide.Shapes.AddShape($msoShapeOval, 690, 410, 170, 170)
        Set-ShapeFill -Shape $disc -HtmlColor $Theme.AccentTwo
        $disc.Line.Visible = 0
        $disc.Fill.Transparency = 0.18
    }
}

function Add-HeaderBlock {
    param(
        [Parameter(Mandatory)]
        $Slide,
        [Parameter(Mandatory)]
        [hashtable]$Theme,
        [Parameter(Mandatory)]
        [string]$SubjectText,
        [Parameter(Mandatory)]
        [string]$GradeText,
        [Parameter(Mandatory)]
        [string]$TitleText,
        [string]$SubtitleText = ""
    )

    $titleShape = $Slide.Shapes.AddTextbox($msoTextOrientationHorizontal, 44, 34, 610, 54)
    Set-TextStyle -Shape $titleShape -Text $TitleText -FontName $Theme.TitleFont -FontSize $(if ($Theme.IsKids) { 24 } else { 28 }) -HtmlColor $Theme.AccentText -Bold

    $metaShape = $Slide.Shapes.AddShape($msoShapeRoundedRectangle, 44, 92, 290, 34)
    Set-ShapeFill -Shape $metaShape -HtmlColor $Theme.Footer
    $metaShape.Line.Visible = 0
    Set-TextStyle -Shape $metaShape -Text ("FÉ™nn: {0}     Sinif: {1}" -f $SubjectText, $GradeText) -FontName $Theme.BodyFont -FontSize 13 -HtmlColor $Theme.AccentText

    if (-not [string]::IsNullOrWhiteSpace($SubtitleText)) {
        $subtitleShape = $Slide.Shapes.AddTextbox($msoTextOrientationHorizontal, 44, 132, 660, 40)
        Set-TextStyle -Shape $subtitleShape -Text $SubtitleText -FontName $Theme.BodyFont -FontSize 16 -HtmlColor $Theme.NoteText
    }
}

function Add-NotePanel {
    param(
        [Parameter(Mandatory)]
        $Slide,
        [Parameter(Mandatory)]
        [hashtable]$Theme,
        [Parameter(Mandatory)]
        [double]$Left,
        [Parameter(Mandatory)]
        [double]$Top,
        [Parameter(Mandatory)]
        [double]$Width,
        [Parameter(Mandatory)]
        [double]$Height
    )

    $panel = $Slide.Shapes.AddShape($msoShapeRoundedRectangle, $Left, $Top, $Width, $Height)
    Set-ShapeFill -Shape $panel -HtmlColor $Theme.Note
    Set-ShapeLine -Shape $panel -HtmlColor $Theme.AccentFour -Weight 1.2

    $text = @(
        "Bu slaydda dÉ™rs mÉ™zmunu avtomatik yazÄ±lmÄ±r.",
        "",
        "MÃ¼É™llim burada bunlarÄ± É™lavÉ™ edir:",
        "â€¢ izahlar",
        "â€¢ suallar",
        "â€¢ Ã§alÄ±ÅŸmalar",
        "â€¢ videolar"
    ) -join [Environment]::NewLine

    Set-TextStyle -Shape $panel -Text $text -FontName $Theme.BodyFont -FontSize 20 -HtmlColor $Theme.NoteText
}

function Add-ButtonShape {
    param(
        [Parameter(Mandatory)]
        $Slide,
        [Parameter(Mandatory)]
        [hashtable]$Theme,
        [Parameter(Mandatory)]
        [string]$Text,
        [Parameter(Mandatory)]
        [double]$Left,
        [Parameter(Mandatory)]
        [double]$Top,
        [Parameter(Mandatory)]
        [double]$Width,
        [Parameter(Mandatory)]
        [double]$Height,
        [Parameter(Mandatory)]
        [string]$FillColor
    )

    $shape = $Slide.Shapes.AddShape($msoShapeRoundedRectangle, $Left, $Top, $Width, $Height)
    Set-ShapeFill -Shape $shape -HtmlColor $FillColor
    $shape.Line.Visible = 0
    Set-TextStyle -Shape $shape -Text $Text -FontName $Theme.TitleFont -FontSize $(if ($Theme.IsKids) { 20 } else { 18 }) -HtmlColor $Theme.ButtonText -Alignment 2 -Bold
    return $shape
}

function Set-SlideHyperlink {
    param(
        [Parameter(Mandatory)]
        $Shape,
        [Parameter(Mandatory)]
        [string]$TargetSlideName
    )

    $action = $Shape.ActionSettings.Item($ppMouseClick)
    $action.Action = $ppActionHyperlink
    $action.Hyperlink.Address = ""
    $action.Hyperlink.SubAddress = $TargetSlideName
}

function Get-SlideNameToken {
    param([string]$Text)

    $safe = [regex]::Replace((Get-NormalizedText $Text), "[^\p{L}\p{N}]+", "-")
    $safe = $safe.Trim("-")

    if ([string]::IsNullOrWhiteSpace($safe)) {
        return "bolme"
    }

    return $safe
}

function Add-MenuButtons {
    param(
        [Parameter(Mandatory)]
        $Slide,
        [Parameter(Mandatory)]
        [hashtable]$Theme,
        [Parameter(Mandatory)]
        [hashtable[]]$ButtonTargets
    )

    $colors = @($Theme.Accent, $Theme.AccentTwo, $Theme.AccentThree, "#C76363", "#7A6FF0", "#00A7A0", "#F29E4C")
    $count = $ButtonTargets.Count
    $rows = @()

    switch ($count) {
        3 { $rows = ,(@(0, 1, 2)) }
        5 { $rows = @(@(0, 1, 2), @(3, 4)) }
        7 { $rows = @(@(0, 1, 2), @(3, 4, 5), @(6)) }
        default { $rows = ,(0..($count - 1)) }
    }

    $top = if ($Theme.IsKids) { 220 } else { 210 }
    $rowHeight = if ($Theme.IsKids) { 94 } else { 88 }
    $buttonWidth = 210
    $buttonHeight = if ($Theme.IsKids) { 74 } else { 68 }
    $gap = 18

    for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
        $row = $rows[$rowIndex]
        $rowCount = $row.Count
        $totalWidth = ($rowCount * $buttonWidth) + (($rowCount - 1) * $gap)
        $left = (960 - $totalWidth) / 2
        $y = $top + ($rowIndex * $rowHeight)

        for ($i = 0; $i -lt $rowCount; $i++) {
            $targetIndex = $row[$i]
            $buttonInfo = $ButtonTargets[$targetIndex]
            $shape = Add-ButtonShape -Slide $Slide -Theme $Theme -Text $buttonInfo.Title -Left ($left + ($i * ($buttonWidth + $gap))) -Top $y -Width $buttonWidth -Height $buttonHeight -FillColor $colors[$targetIndex % $colors.Count]
            Set-SlideHyperlink -Shape $shape -TargetSlideName $buttonInfo.SlideName
        }
    }
}

function New-AzerslidePresentation {
    param(
        [Parameter(Mandatory)]
        [string]$SubjectText,
        [Parameter(Mandatory)]
        [string]$GradeText,
        [Parameter(Mandatory)]
        [string[]]$ButtonTitles,
        [string]$SavePath,
        [switch]$SkipOpen
    )

    $cleanSubject = Get-CanonicalSubject $SubjectText
    $theme = Get-ThemeConfig $GradeText
    $presentation = $null
    $powerPoint = $null
    $buttonTargets = @()

    try {
        $powerPoint = New-Object -ComObject PowerPoint.Application
        $powerPoint.Visible = -1
        $presentation = $powerPoint.Presentations.Add()

        $slideWidth = [double]$presentation.PageSetup.SlideWidth
        $slideHeight = [double]$presentation.PageSetup.SlideHeight

        $menuSlide = $presentation.Slides.Add(1, $ppLayoutBlank)
        $menuSlide.Name = "menu-main"
        Add-BackgroundLayer -Slide $menuSlide -Theme $theme -SlideWidth $slideWidth -SlideHeight $slideHeight
        Add-HeaderBlock -Slide $menuSlide -Theme $theme -SubjectText $cleanSubject -GradeText $GradeText -TitleText "AzÉ™rslide dÉ™rs menyusu" -SubtitleText $theme.ModeLabel

        $hintBox = $menuSlide.Shapes.AddShape($msoShapeRoundedRectangle, 44, 158, 450, 42)
        Set-ShapeFill -Shape $hintBox -HtmlColor $theme.Subtle
        Set-ShapeLine -Shape $hintBox -HtmlColor $theme.AccentFour -Weight 1
        Set-TextStyle -Shape $hintBox -Text "DÃ¼ymÉ™yÉ™ klik edin vÉ™ uyÄŸun slayda keÃ§in." -FontName $theme.BodyFont -FontSize 16 -HtmlColor $theme.NoteText

        for ($index = 0; $index -lt $ButtonTitles.Count; $index++) {
            $buttonTitle = $ButtonTitles[$index]
            $slide = $presentation.Slides.Add($index + 2, $ppLayoutBlank)
            $slideToken = Get-SlideNameToken ("{0}-{1}" -f ($index + 2), $buttonTitle)
            $slide.Name = "section-$slideToken"

            Add-BackgroundLayer -Slide $slide -Theme $theme -SlideWidth $slideWidth -SlideHeight $slideHeight
            $slideTitle = "SLAYD {0} - {1}" -f ($index + 2), $buttonTitle
            Add-HeaderBlock -Slide $slide -Theme $theme -SubjectText $cleanSubject -GradeText $GradeText -TitleText $slideTitle -SubtitleText "MÉ™zmunu mÃ¼É™llim Ã¶zÃ¼ doldurur."
            Add-NotePanel -Slide $slide -Theme $theme -Left 52 -Top 206 -Width 580 -Height 246

            $sidePanel = $slide.Shapes.AddShape($msoShapeRoundedRectangle, 664, 206, 232, 246)
            Set-ShapeFill -Shape $sidePanel -HtmlColor $theme.Subtle
            Set-ShapeLine -Shape $sidePanel -HtmlColor $theme.AccentFour -Weight 1
            Set-TextStyle -Shape $sidePanel -Text ("Bu bÃ¶lmÉ™ Ã¼Ã§Ã¼n É™lavÉ™ edÉ™ bilÉ™rsiniz:" + [Environment]::NewLine + [Environment]::NewLine + "â€¢ tÉ™qdimat qeydlÉ™ri" + [Environment]::NewLine + "â€¢ qÄ±sa tapÅŸÄ±rÄ±qlar" + [Environment]::NewLine + "â€¢ ÅŸÉ™killÉ™r vÉ™ videolar" + [Environment]::NewLine + "â€¢ siniflÉ™ dialoq") -FontName $theme.BodyFont -FontSize 18 -HtmlColor $theme.NoteText

            $backButton = Add-ButtonShape -Slide $slide -Theme $theme -Text "Geri menyuya" -Left 52 -Top 484 -Width 220 -Height 52 -FillColor $theme.Accent
            Set-SlideHyperlink -Shape $backButton -TargetSlideName $menuSlide.Name

            $buttonTargets += @{
                Title = $buttonTitle
                SlideName = $slide.Name
            }
        }

        Add-MenuButtons -Slide $menuSlide -Theme $theme -ButtonTargets $buttonTargets

        if ([string]::IsNullOrWhiteSpace($SavePath)) {
            $safeSubject = [regex]::Replace($cleanSubject, "[^\p{L}\p{N}]+", "_").Trim("_")
            $safeGrade = [regex]::Replace($GradeText, "[^\p{L}\p{N}]+", "_").Trim("_")
            $SavePath = Join-Path -Path (Get-Location) -ChildPath ("Azerslide_{0}_{1}.pptx" -f $safeSubject, $safeGrade)
        }

        $resolvedSavePath = [System.IO.Path]::GetFullPath($SavePath)
        $presentation.SaveAs($resolvedSavePath, $ppSaveAsOpenXMLPresentation)

        if (-not $SkipOpen) {
            Start-Process -FilePath $resolvedSavePath
        }

        return $resolvedSavePath
    }
    finally {
        if ($presentation) {
            $presentation.Close() | Out-Null
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
        }
        if ($powerPoint) {
            $powerPoint.Quit()
            [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
        }
        [GC]::Collect()
        [GC]::WaitForPendingFinalizers()
    }
}

function Get-PlanPreviewText {
    param(
        [string]$SubjectText,
        [string]$GradeText,
        [string[]]$ButtonTitles
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("Sizin tÉ™qdimat strukturunuz hazÄ±rdÄ±r!")
    $lines.Add("")
    $lines.Add(("FÉ™nn: {0}" -f $(if ([string]::IsNullOrWhiteSpace($SubjectText)) { "[FÉ™nn adÄ±]" } else { $SubjectText })))
    $lines.Add(("Sinif: {0}" -f $(if ([string]::IsNullOrWhiteSpace($GradeText)) { "[Sinif]" } else { $GradeText })))
    $lines.Add("")
    $lines.Add("SLAYD 1 - GiriÅŸ (Menu)")

    foreach ($buttonTitle in $ButtonTitles) {
        if (-not [string]::IsNullOrWhiteSpace($buttonTitle)) {
            $lines.Add(("â€¢ {0}" -f $buttonTitle))
        }
    }

    $slideNumber = 2
    foreach ($buttonTitle in $ButtonTitles) {
        if (-not [string]::IsNullOrWhiteSpace($buttonTitle)) {
            $lines.Add(("SLAYD {0} - {1}" -f $slideNumber, $buttonTitle))
            $slideNumber++
        }
    }

    $lines.Add("")
    $lines.Add("Naviqasiya:")
    $lines.Add("â€¢ HÉ™r dÃ¼ymÉ™ uyÄŸun slayda keÃ§id verir.")
    $lines.Add("â€¢ HÉ™r slaydda Geri menyuya dÃ¼ymÉ™si var.")

    return ($lines -join [Environment]::NewLine)
}

function Show-AzerslideDesigner {
    [System.Windows.Forms.Application]::EnableVisualStyles()

    $themeColor = [System.Drawing.ColorTranslator]::FromHtml("#F2F4F8")
    $accentColor = [System.Drawing.ColorTranslator]::FromHtml("#244C72")
    $warmColor = [System.Drawing.ColorTranslator]::FromHtml("#F7B267")

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "AzÉ™rslide PowerPoint PlanlayÄ±cÄ±sÄ±"
    $form.StartPosition = "CenterScreen"
    $form.Size = New-Object System.Drawing.Size(1180, 760)
    $form.MinimumSize = New-Object System.Drawing.Size(1180, 760)
    $form.BackColor = [System.Drawing.Color]::White
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

    $header = New-Object System.Windows.Forms.Panel
    $header.Dock = "Top"
    $header.Height = 96
    $header.BackColor = $accentColor
    $form.Controls.Add($header)

    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "AzÉ™rslide - hÉ™qiqi PowerPoint yaradÄ±cÄ±"
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 24)
    $titleLabel.Location = New-Object System.Drawing.Point(28, 18)
    $titleLabel.AutoSize = $true
    $header.Controls.Add($titleLabel)

    $subtitleLabel = New-Object System.Windows.Forms.Label
    $subtitleLabel.Text = "FÉ™nni seÃ§in, dÃ¼ymÉ™lÉ™ri qurun vÉ™ birbaÅŸa .pptx faylÄ± yaradÄ±n."
    $subtitleLabel.ForeColor = [System.Drawing.Color]::White
    $subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $subtitleLabel.Location = New-Object System.Drawing.Point(32, 62)
    $subtitleLabel.AutoSize = $true
    $header.Controls.Add($subtitleLabel)

    $leftPanel = New-Object System.Windows.Forms.Panel
    $leftPanel.Location = New-Object System.Drawing.Point(24, 118)
    $leftPanel.Size = New-Object System.Drawing.Size(510, 584)
    $leftPanel.BackColor = $themeColor
    $leftPanel.BorderStyle = "FixedSingle"
    $form.Controls.Add($leftPanel)

    $rightPanel = New-Object System.Windows.Forms.Panel
    $rightPanel.Location = New-Object System.Drawing.Point(554, 118)
    $rightPanel.Size = New-Object System.Drawing.Size(590, 584)
    $rightPanel.BackColor = [System.Drawing.Color]::White
    $rightPanel.BorderStyle = "FixedSingle"
    $form.Controls.Add($rightPanel)

    $subjectLabel = New-Object System.Windows.Forms.Label
    $subjectLabel.Text = "FÉ™nn adÄ±"
    $subjectLabel.Location = New-Object System.Drawing.Point(24, 22)
    $subjectLabel.AutoSize = $true
    $subjectLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $leftPanel.Controls.Add($subjectLabel)

    $subjectBox = New-Object System.Windows.Forms.ComboBox
    $subjectBox.Location = New-Object System.Drawing.Point(24, 48)
    $subjectBox.Size = New-Object System.Drawing.Size(452, 34)
    $subjectBox.DropDownStyle = "DropDown"
    [void]$subjectBox.Items.AddRange((Get-CurriculumSubjects))
    $leftPanel.Controls.Add($subjectBox)

    $gradeLabel = New-Object System.Windows.Forms.Label
    $gradeLabel.Text = "Sinif"
    $gradeLabel.Location = New-Object System.Drawing.Point(24, 94)
    $gradeLabel.AutoSize = $true
    $gradeLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $leftPanel.Controls.Add($gradeLabel)

    $gradeBox = New-Object System.Windows.Forms.TextBox
    $gradeBox.Location = New-Object System.Drawing.Point(24, 120)
    $gradeBox.Size = New-Object System.Drawing.Size(452, 32)
    $leftPanel.Controls.Add($gradeBox)

    $countLabel = New-Object System.Windows.Forms.Label
    $countLabel.Text = "NeÃ§É™ giriÅŸ dÃ¼ymÉ™si olsun?"
    $countLabel.Location = New-Object System.Drawing.Point(24, 166)
    $countLabel.AutoSize = $true
    $countLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $leftPanel.Controls.Add($countLabel)

    $count3 = New-Object System.Windows.Forms.RadioButton
    $count3.Text = "3"
    $count3.Location = New-Object System.Drawing.Point(28, 194)
    $count3.Checked = $true
    $leftPanel.Controls.Add($count3)

    $count5 = New-Object System.Windows.Forms.RadioButton
    $count5.Text = "5"
    $count5.Location = New-Object System.Drawing.Point(92, 194)
    $leftPanel.Controls.Add($count5)

    $count7 = New-Object System.Windows.Forms.RadioButton
    $count7.Text = "7"
    $count7.Location = New-Object System.Drawing.Point(156, 194)
    $leftPanel.Controls.Add($count7)

    $modeLabel = New-Object System.Windows.Forms.Label
    $modeLabel.Location = New-Object System.Drawing.Point(24, 226)
    $modeLabel.Size = New-Object System.Drawing.Size(452, 38)
    $modeLabel.ForeColor = $accentColor
    $modeLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $leftPanel.Controls.Add($modeLabel)

    $suggestionLabel = New-Object System.Windows.Forms.Label
    $suggestionLabel.Text = "FÉ™nnÉ™ uyÄŸun dÃ¼ymÉ™ tÉ™kliflÉ™ri"
    $suggestionLabel.Location = New-Object System.Drawing.Point(24, 272)
    $suggestionLabel.AutoSize = $true
    $suggestionLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $leftPanel.Controls.Add($suggestionLabel)

    $suggestionPanel = New-Object System.Windows.Forms.FlowLayoutPanel
    $suggestionPanel.Location = New-Object System.Drawing.Point(24, 300)
    $suggestionPanel.Size = New-Object System.Drawing.Size(452, 84)
    $suggestionPanel.WrapContents = $true
    $suggestionPanel.AutoScroll = $true
    $suggestionPanel.BackColor = [System.Drawing.Color]::White
    $suggestionPanel.BorderStyle = "FixedSingle"
    $leftPanel.Controls.Add($suggestionPanel)

    $inputLabel = New-Object System.Windows.Forms.Label
    $inputLabel.Text = "HansÄ± dÃ¼ymÉ™lÉ™ri istÉ™yirsiniz?"
    $inputLabel.Location = New-Object System.Drawing.Point(24, 396)
    $inputLabel.AutoSize = $true
    $inputLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $leftPanel.Controls.Add($inputLabel)

    $buttonInputsPanel = New-Object System.Windows.Forms.Panel
    $buttonInputsPanel.Location = New-Object System.Drawing.Point(24, 424)
    $buttonInputsPanel.Size = New-Object System.Drawing.Size(452, 118)
    $buttonInputsPanel.AutoScroll = $true
    $buttonInputsPanel.BackColor = [System.Drawing.Color]::White
    $buttonInputsPanel.BorderStyle = "FixedSingle"
    $leftPanel.Controls.Add($buttonInputsPanel)

    $fillButton = New-Object System.Windows.Forms.Button
    $fillButton.Text = "TÉ™kliflÉ™ri doldur"
    $fillButton.Location = New-Object System.Drawing.Point(24, 552)
    $fillButton.Size = New-Object System.Drawing.Size(144, 34)
    $fillButton.BackColor = $warmColor
    $fillButton.FlatStyle = "Flat"
    $fillButton.FlatAppearance.BorderSize = 0
    $leftPanel.Controls.Add($fillButton)

    $clearButton = New-Object System.Windows.Forms.Button
    $clearButton.Text = "TÉ™mizlÉ™"
    $clearButton.Location = New-Object System.Drawing.Point(180, 552)
    $clearButton.Size = New-Object System.Drawing.Size(110, 34)
    $clearButton.FlatStyle = "Flat"
    $leftPanel.Controls.Add($clearButton)

    $previewTitle = New-Object System.Windows.Forms.Label
    $previewTitle.Text = "Slayd Ã¶nizlÉ™mÉ™si"
    $previewTitle.Location = New-Object System.Drawing.Point(22, 18)
    $previewTitle.AutoSize = $true
    $previewTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12)
    $rightPanel.Controls.Add($previewTitle)

    $previewBox = New-Object System.Windows.Forms.RichTextBox
    $previewBox.Location = New-Object System.Drawing.Point(22, 48)
    $previewBox.Size = New-Object System.Drawing.Size(544, 450)
    $previewBox.ReadOnly = $true
    $previewBox.BackColor = [System.Drawing.Color]::WhiteSmoke
    $previewBox.BorderStyle = "FixedSingle"
    $previewBox.Font = New-Object System.Drawing.Font("Consolas", 11)
    $rightPanel.Controls.Add($previewBox)

    $helpTitle = New-Object System.Windows.Forms.Label
    $helpTitle.Text = "NÉ™ yaradÄ±lacaq?"
    $helpTitle.Location = New-Object System.Drawing.Point(22, 516)
    $helpTitle.AutoSize = $true
    $helpTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $rightPanel.Controls.Add($helpTitle)

    $helpBody = New-Object System.Windows.Forms.Label
    $helpBody.Text = "â€¢ SLAYD 1 É™sas menyu olacaq.`nâ€¢ HÉ™r dÃ¼ymÉ™ ayrÄ±ca slayda keÃ§É™cÉ™k.`nâ€¢ HÉ™r slaydda Geri menyuya dÃ¼ymÉ™si olacaq.`nâ€¢ MÉ™zmunu mÃ¼É™llim Ã¶zÃ¼ É™lavÉ™ edÉ™cÉ™k."
    $helpBody.Location = New-Object System.Drawing.Point(24, 546)
    $helpBody.Size = New-Object System.Drawing.Size(544, 70)
    $helpBody.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $rightPanel.Controls.Add($helpBody)

    $generateButton = New-Object System.Windows.Forms.Button
    $generateButton.Text = "PowerPoint yarat"
    $generateButton.Location = New-Object System.Drawing.Point(930, 58)
    $generateButton.Size = New-Object System.Drawing.Size(214, 42)
    $generateButton.BackColor = $warmColor
    $generateButton.FlatStyle = "Flat"
    $generateButton.FlatAppearance.BorderSize = 0
    $generateButton.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
    $form.Controls.Add($generateButton)

    $modeToggleButton = New-Object System.Windows.Forms.Button
    $modeToggleButton.Text = "☾"
    $modeToggleButton.Location = New-Object System.Drawing.Point(1090, 278)
    $modeToggleButton.Size = New-Object System.Drawing.Size(54, 54)
    $modeToggleButton.Anchor = "Top,Right"
    $modeToggleButton.FlatStyle = "Flat"
    $modeToggleButton.FlatAppearance.BorderSize = 0
    $modeToggleButton.Font = New-Object System.Drawing.Font("Segoe UI Symbol", 18)
    $modeToggleButton.BackColor = [System.Drawing.Color]::White
    $modeToggleButton.ForeColor = $accentColor
    $form.Controls.Add($modeToggleButton)

    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Location = New-Object System.Drawing.Point(30, 708)
    $statusLabel.Size = New-Object System.Drawing.Size(1114, 24)
    $statusLabel.ForeColor = $accentColor
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($statusLabel)

    $buttonTextBoxes = New-Object System.Collections.Generic.List[System.Windows.Forms.TextBox]
    $isNightMode = $false

    function Get-SelectedButtonCount {
        if ($count7.Checked) { return 7 }
        if ($count5.Checked) { return 5 }
        return 3
    }

    function Get-CurrentButtonTitles {
        $titles = @()
        foreach ($box in $buttonTextBoxes) {
            $titles += $box.Text.Trim()
        }
        return @($titles)
    }

    function Update-ModeLabel {
        $theme = Get-ThemeConfig $gradeBox.Text
        $modeLabel.Text = $theme.ModeLabel
    }

    function Apply-UiMode {
        $formBack = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#0D1117") } else { [System.Drawing.Color]::White }
        $headerBack = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#05080D") } else { $accentColor }
        $panelBack = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#161B22") } else { $themeColor }
        $panelAlt = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#11161D") } else { [System.Drawing.Color]::White }
        $inputBack = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#1F2630") } else { [System.Drawing.Color]::White }
        $previewBack = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#0F141B") } else { [System.Drawing.Color]::WhiteSmoke }
        $textColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#F1F5F9") } else { [System.Drawing.ColorTranslator]::FromHtml("#182433") }
        $mutedText = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#B7C4D4") } else { $accentColor }
        $borderColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#344050") } else { $accentColor }

        $form.BackColor = $formBack
        $header.BackColor = $headerBack
        $titleLabel.ForeColor = [System.Drawing.Color]::White
        $subtitleLabel.ForeColor = [System.Drawing.Color]::White

        $leftPanel.BackColor = $panelBack
        $rightPanel.BackColor = $panelAlt

        $subjectLabel.ForeColor = $textColor
        $gradeLabel.ForeColor = $textColor
        $countLabel.ForeColor = $textColor
        $modeLabel.ForeColor = $mutedText
        $suggestionLabel.ForeColor = $textColor
        $inputLabel.ForeColor = $textColor
        $previewTitle.ForeColor = $textColor
        $helpTitle.ForeColor = $textColor
        $helpBody.ForeColor = $textColor
        $statusLabel.ForeColor = $mutedText

        $subjectBox.BackColor = $inputBack
        $subjectBox.ForeColor = $textColor
        $gradeBox.BackColor = $inputBack
        $gradeBox.ForeColor = $textColor

        foreach ($radio in @($count3, $count5, $count7)) {
            $radio.BackColor = $panelBack
            $radio.ForeColor = $textColor
        }

        $suggestionPanel.BackColor = $inputBack
        $buttonInputsPanel.BackColor = $inputBack
        $previewBox.BackColor = $previewBack
        $previewBox.ForeColor = $textColor

        foreach ($chip in $suggestionPanel.Controls) {
            if ($chip -is [System.Windows.Forms.Button]) {
                $chip.BackColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#1E2936") } else { [System.Drawing.Color]::White }
                $chip.ForeColor = $textColor
                $chip.FlatAppearance.BorderColor = $borderColor
            }
        }

        foreach ($input in $buttonTextBoxes) {
            $input.BackColor = $inputBack
            $input.ForeColor = $textColor
        }

        foreach ($control in $buttonInputsPanel.Controls) {
            if ($control -is [System.Windows.Forms.Label]) {
                $control.ForeColor = $textColor
                $control.BackColor = $inputBack
            }
        }

        $clearButton.BackColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#1E2631") } else { [System.Drawing.Color]::White }
        $clearButton.ForeColor = $textColor

        $modeToggleButton.Text = if ($isNightMode) { "☀" } else { "☾" }
        $modeToggleButton.BackColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#F8C65D") } else { [System.Drawing.Color]::White }
        $modeToggleButton.ForeColor = if ($isNightMode) { [System.Drawing.ColorTranslator]::FromHtml("#3A2A00") } else { $accentColor }
        $modeToggleButton.FlatAppearance.BorderColor = $borderColor
    }

    function Update-Preview {
        $previewBox.Text = Get-PlanPreviewText -SubjectText $subjectBox.Text.Trim() -GradeText $gradeBox.Text.Trim() -ButtonTitles (Get-CurrentButtonTitles)
        Update-ModeLabel
    }

    function Rebuild-ButtonInputs {
        $existingValues = @(Get-CurrentButtonTitles)
        $buttonInputsPanel.Controls.Clear()
        $buttonTextBoxes.Clear()

        $count = Get-SelectedButtonCount
        $suggestions = @(Get-SubjectSuggestions $subjectBox.Text)

        for ($i = 0; $i -lt $count; $i++) {
            $rowLabel = New-Object System.Windows.Forms.Label
            $rowLabel.Text = "{0}." -f ($i + 1)
            $rowLabel.Location = New-Object System.Drawing.Point(12, (12 + ($i * 38)))
            $rowLabel.Size = New-Object System.Drawing.Size(26, 26)
            $buttonInputsPanel.Controls.Add($rowLabel)

            $rowBox = New-Object System.Windows.Forms.TextBox
            $rowBox.Location = New-Object System.Drawing.Point(42, (8 + ($i * 38)))
            $rowBox.Size = New-Object System.Drawing.Size(384, 30)
            $seed = ""

            if ($i -lt $existingValues.Count -and -not [string]::IsNullOrWhiteSpace($existingValues[$i])) {
                $seed = $existingValues[$i]
            }
            elseif ($i -lt $suggestions.Count) {
                $seed = $suggestions[$i]
            }

            $rowBox.Text = $seed
            $rowBox.Add_TextChanged({ Update-Preview })
            $buttonInputsPanel.Controls.Add($rowBox)
            [void]$buttonTextBoxes.Add($rowBox)
        }

        Apply-UiMode
        Update-Preview
    }

    function Fill-ButtonsFromSuggestions {
        $suggestions = @(Get-SubjectSuggestions $subjectBox.Text)
        for ($i = 0; $i -lt $buttonTextBoxes.Count; $i++) {
            $buttonTextBoxes[$i].Text = if ($i -lt $suggestions.Count) { $suggestions[$i] } else { "" }
        }
        $statusLabel.Text = "TÃ¶vsiyÉ™lÉ™r dÃ¼ymÉ™ sahÉ™lÉ™rinÉ™ yerlÉ™ÅŸdirildi."
        Update-Preview
    }

    function Update-SuggestionButtons {
        $suggestionPanel.Controls.Clear()
        foreach ($suggestion in (Get-SubjectSuggestions $subjectBox.Text)) {
            $chipValue = $suggestion
            $chip = New-Object System.Windows.Forms.Button
            $chip.Text = $chipValue
            $chip.AutoSize = $true
            $chip.AutoSizeMode = "GrowAndShrink"
            $chip.Padding = New-Object System.Windows.Forms.Padding(10, 6, 10, 6)
            $chip.BackColor = [System.Drawing.Color]::White
            $chip.FlatStyle = "Flat"
            $chip.FlatAppearance.BorderColor = $accentColor
            $chip.FlatAppearance.BorderSize = 1
            $chip.Add_Click({
                $emptyBox = $buttonTextBoxes | Where-Object { [string]::IsNullOrWhiteSpace($_.Text) } | Select-Object -First 1
                if (-not $emptyBox) {
                    $statusLabel.Text = "BÃ¼tÃ¼n sahÉ™lÉ™r doludur. MÃ¶vcud adlardan birini dÉ™yiÅŸin vÉ™ ya TÉ™kliflÉ™ri doldur dÃ¼ymÉ™sindÉ™n istifadÉ™ edin."
                    return
                }
                $emptyBox.Text = $chipValue
                $statusLabel.Text = ('"{0}" É™lavÉ™ edildi.' -f $chipValue)
                Update-Preview
            })
            $suggestionPanel.Controls.Add($chip)
        }

        Apply-UiMode
    }

    $subjectBox.Add_TextChanged({
        Update-SuggestionButtons
        Rebuild-ButtonInputs
    })

    $gradeBox.Add_TextChanged({ Update-ModeLabel; Update-Preview })
    $count3.Add_CheckedChanged({ if ($count3.Checked) { Rebuild-ButtonInputs } })
    $count5.Add_CheckedChanged({ if ($count5.Checked) { Rebuild-ButtonInputs } })
    $count7.Add_CheckedChanged({ if ($count7.Checked) { Rebuild-ButtonInputs } })

    $fillButton.Add_Click({ Fill-ButtonsFromSuggestions })

    $modeToggleButton.Add_Click({
        $isNightMode = -not $isNightMode
        Apply-UiMode
    })

    $clearButton.Add_Click({
        $subjectBox.Text = ""
        $gradeBox.Text = ""
        $count3.Checked = $true
        $statusLabel.Text = "Forma tÉ™mizlÉ™ndi."
        Update-SuggestionButtons
        Rebuild-ButtonInputs
    })

    $generateButton.Add_Click({
        $teacherSubject = $subjectBox.Text.Trim()
        $teacherGrade = $gradeBox.Text.Trim()
        $teacherButtons = @(Get-CurrentButtonTitles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $selectedCount = Get-SelectedButtonCount

        if ([string]::IsNullOrWhiteSpace($teacherSubject) -or [string]::IsNullOrWhiteSpace($teacherGrade)) {
            [System.Windows.Forms.MessageBox]::Show("FÉ™nn adÄ± vÉ™ sinif sahÉ™lÉ™ri doldurulmalÄ±dÄ±r.", "MÉ™lumat Ã§atÄ±ÅŸmÄ±r", "OK", "Warning") | Out-Null
            return
        }

        if ($teacherButtons.Count -ne $selectedCount) {
            [System.Windows.Forms.MessageBox]::Show("SeÃ§ilmiÅŸ say qÉ™dÉ™r dÃ¼ymÉ™ adÄ± doldurulmalÄ±dÄ±r.", "DÃ¼ymÉ™ adlarÄ± natamamdÄ±r", "OK", "Warning") | Out-Null
            return
        }

        $uniqueNames = @($teacherButtons | ForEach-Object { Get-NormalizedText $_ } | Select-Object -Unique)
        if ($uniqueNames.Count -ne $teacherButtons.Count) {
            [System.Windows.Forms.MessageBox]::Show("DÃ¼ymÉ™ adlarÄ± bir-birindÉ™n fÉ™rqli olmalÄ±dÄ±r.", "TÉ™krarlanan ad", "OK", "Warning") | Out-Null
            return
        }

        $dialog = New-Object System.Windows.Forms.SaveFileDialog
        $dialog.Filter = "PowerPoint Presentation (*.pptx)|*.pptx"
        $dialog.Title = "PowerPoint faylÄ±nÄ± saxla"
        $dialog.FileName = ("Azerslide_{0}_{1}.pptx" -f ([regex]::Replace((Get-CanonicalSubject $teacherSubject), "[^\p{L}\p{N}]+", "_").Trim("_")), ([regex]::Replace($teacherGrade, "[^\p{L}\p{N}]+", "_").Trim("_")))

        if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
            return
        }

        try {
            $statusLabel.Text = "PowerPoint yaradÄ±lÄ±r..."
            $createdPath = New-AzerslidePresentation -SubjectText $teacherSubject -GradeText $teacherGrade -ButtonTitles $teacherButtons -SavePath $dialog.FileName
            $statusLabel.Text = ("HazÄ±rdÄ±r: {0}" -f $createdPath)
            [System.Windows.Forms.MessageBox]::Show("Sizin PowerPoint tÉ™qdimatÄ±nÄ±z hazÄ±rdÄ±r!", "HazÄ±rdÄ±r", "OK", "Information") | Out-Null
        }
        catch {
            $statusLabel.Text = "Yaratma zamanÄ± xÉ™ta baÅŸ verdi."
            [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "XÉ™ta", "OK", "Error") | Out-Null
        }
    })

    Update-SuggestionButtons
    Rebuild-ButtonInputs
    Update-ModeLabel
    Update-Preview
    Apply-UiMode

    [void]$form.ShowDialog()
}

function Start-Azerslide {
    if ($Gui -or [string]::IsNullOrWhiteSpace($Subject)) {
        Show-AzerslideDesigner
        return
    }

    if ([string]::IsNullOrWhiteSpace($Subject) -or [string]::IsNullOrWhiteSpace($Grade)) {
        throw "CLI rejimində Subject və Grade parametrləri verilməlidir."
    }

    if ($ButtonCount -notin @(3, 5, 7)) {
        throw "CLI rejimində ButtonCount parametri verilməlidir."
    }

    $preparedButtons = @()

    if ($ButtonNames -and @($ButtonNames).Count -gt 0) {
        $rawButtonNames = @($ButtonNames)

        if ($rawButtonNames.Count -eq 1 -and $rawButtonNames[0] -match ",") {
            $rawButtonNames = @($rawButtonNames[0] -split ",")
        }

        $preparedButtons = @($rawButtonNames | ForEach-Object {
            if ($null -eq $_) {
                ""
            }
            else {
                $_.Trim()
            }
        } | Where-Object { $_ })
    }
    else {
        $preparedButtons = @(Get-SubjectSuggestions $Subject | Select-Object -First $ButtonCount)
    }

    if (@($preparedButtons).Count -ne $ButtonCount) {
        throw "ButtonCount qədər düymə adı verilməlidir."
    }

    $normalizedUnique = @($preparedButtons | ForEach-Object { Get-NormalizedText $_ } | Select-Object -Unique)
    if ($normalizedUnique.Count -ne @($preparedButtons).Count) {
        throw "Düymə adları təkrarlanmamalıdır."
    }

    $created = New-AzerslidePresentation -SubjectText $Subject -GradeText $Grade -ButtonTitles $preparedButtons -SavePath $OutputPath -SkipOpen:$NoOpen
    Write-Host ("Hazırdır: {0}" -f $created)
}

Start-Azerslide





