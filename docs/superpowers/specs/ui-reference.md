# Ref IoT Android app (the reference package) - UI reference for a React Native clone

Source: `the reference APK`, package `the reference package`, apktool `res/` plus jadx sources.
Paths below are relative to the scratchpad `decoded/res/` (resources) or `src/sources/` (java, obfuscated names kept as-is).

Conventions
- dp = RN logical px, sp = RN font size (no extra scaling), `a%` = alpha in percent.
- Evidence = resource/class name where the value was read. **GUESS** marks anything not read directly from the APK.
- Android attribute `?refXxx` is a theme attribute; it resolves to different colors in light and dark (section 1).
- Shape corner tokens (values/styles.xml, `ShapeAppearance.Material3.*`, overridden by Ref): Small = 4dp, Medium = 8dp, Large = 8dp. Pill/Circle = 50%.

---

## 1. Color tokens

Theme parents: light `Ref.Theme.Base : Theme.Material3.Light.NoActionBar` (values/styles.xml), dark `Ref.Theme.Base : Theme.Material3.Dark.NoActionBar` (values-night/styles.xml). Colors: `values/colors.xml` (light) and `values-night/colors.xml` (dark override). The theme maps `colorOnBackground = colorOnSurface = ?refNeutralColor`.

### 1.1 Semantic tokens

| Role | Theme attr | Light | Dark | Evidence |
|---|---|---|---|---|
| Screen background | `refBackgroundColor` | `#FBFBFB` | `#1D1E22` | colors.xml `ref_background` |
| List / settings screen background | `refListBackgroundColor` | `#EFF3F2` | `#232529` | `ref_list_background` |
| Surface (cards, widgets, bottom bar, sheets, dialogs, tile card) | `refSecondaryBackgroundColor` | `#FFFFFF` | `#303136` | `ref_secondary_background` |
| Illustration/empty icon bg | `refIllustrationBackgroundColor` | `#EFF3F2` | `#232529` | `ref_illustration_background` |
| Text primary (titles, values, list title) | `refNeutralColor9` | `rgba(3,3,10,.85)` `#D9 03030A` | `rgba(255,255,255,.85)` `#D9FFFFFF` | `ref_neutral_9` |
| Text strong (`refNeutralColor` / `Neutral10`) | `refNeutralColor` | `#03030A` | `#D9FFFFFF` | `ref_neutral` -> `neutral_10` |
| Text secondary (widget label, subtitle, inactive nav) | `refNeutralColor8` | `rgba(3,3,10,.65)` `#A603030A` | `rgba(255,255,255,.65)` `#A6FFFFFF` | `ref_neutral_8` |
| Text tertiary / value hint | `refNeutralColor7` | `.45` `#7303030A` | `.45` `#73FFFFFF` | `ref_neutral_7`; `ref_edit_field_text` (default state) |
| Hint / placeholder, section header text | `refNeutralColor6` | `.25` `#4003030A` | `.35` `#59FFFFFF` | `Ref.Components.EditText textColorHint`; `menu_header_group` |
| Disabled text / grid dots | `refNeutralColor5` | `.15` `#2603030A` | `.25` `#40FFFFFF` | `ref_edit_field_text` disabled; GridDrawable point color |
| Stroke (tile card, picker icon box, step divider) | `refNeutralColor4` | `.10` `#1A03030A` | `.15` `#26FFFFFF` | `Ref.Components.Tile.Layout` |
| Stroke (widget card, edit field, chip) | `refNeutralColor3` | `.06` `#0F03030A` | `.10` `#1AFFFFFF` | `Ref.Components.Dashboard.Widget.Background` |
| Divider (list), edit-field fill, chip fill, pressed row | `refNeutralColor2` | `.02` `#0503030A` | `.06` `#0FFFFFFF` | `ref_list_divider.xml`, `Ref.Components.EditText boxBackgroundColor` |
| Focus overlay | `refNeutralColor1` | `.01` `#0303030A` | `.04` `#0AFFFFFF` | `ref_neutral_1` |
| White (always `#FFFFFF`) | `refNeutralWhiteColor` | `#FFFFFF` | `#FFFFFF` | `ref_neutral_white` (not overridden in night) |
| Brand (accent) | `refBrandColor` | `#24C48E` | `#24C48E` | `ref_brand_6` |
| On brand | `refOnBrandColor` | `#07271C` | `#07271C` | `ref_on_brand` |
| Primary | `refPrimaryColor` | `#262957` (navy) | `#24C48E` (= brand) | `ref_primary_6`; night `ref_primary_*` are brand shades |
| On primary | `refOnPrimaryColor` | `#FFFFFF` | `#07271C` | `ref_on_primary` |
| Primary-ish text / selected nav / link | `refTextPrimaryColor` = `?refPrimaryColor6` | `#262957` | `#24C48E` | Ref.Theme.Base item |
| Link | `refLinkNormalColor` | `#5572D3` | `#24C48E` | `ref_link_*` (pressed light `#324177`, dark `#1D9D72`) |
| Critical | `refCriticalColor` | `#D3435C` | `#D3435C` | light `critical_6`, dark `critical_5` |
| Positive | `refPositiveColor` | `#8AD95D` | `#8AD95D` | light `positive_6`, dark `positive_5` |
| Warning | `refWarningColor` | `#ED9D00` | `#ED9D00` | `warning_6` / `warning_5` |
| Complementary 1/2/3 | `refComplimentaryColorOne/Two/Three` | `#5471D3` / `#01B8F7` / `#006AD9` | same | `ref_complimentary*_6` |
| Camera bg | - | `#1D1E22` | same | `ref_camera_background` |
| Overlay solid | `refOverlaySolid1/2` | `#4D03030A` / `#7303030A` | same (not overridden) | colors.xml |
| zeRGBa channel colors | - | R `#DA6277`, G `#8AD95D`, B `#3595D4` | same | `ref_default_zergba_*` |
| Default widget color (new widget) | `ThemeColor.DEFAULT_COLOR` | `#24C48E` | `#24C48E` | `model/core/widget/ThemeColor.java` |

Role aliases the clone needs (derived): divider = neutral2; app bar bg = background (list screens use list background); bottom nav bg = surface; widget card bg = surface with 1dp neutral3 stroke; tile card = surface with 1dp neutral4 stroke.

### 1.2 Shade ramps (same in both themes unless noted)

| Ramp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| brand | `#DBF5EC` | `#B6EBD9` | `#92E2C7` | `#6DD8B4` | `#49CEA1` | `#24C48E` | `#1D9D72` | `#167655` | `#0E4E39` | `#07271C` |
| primary (light) | `#DBDBE3` | `#B7B8C7` | `#9394AB` | `#6E708F` | `#4A4D73` | `#262957` | `#1E2146` | `#D903030A` (sic) | `#0F1023` | `#080811` |
| critical (light; dark reverses 1..10) | `#F8E0E4` | `#F0C0C9` | `#E9A1AE` | `#E28292` | `#DA6277` | `#D3435C` | `#A9364A` | `#7F2837` | `#541B25` | `#2A0D12` |
| warning (light) | `#FCEFD5` | `#F9DEAA` | `#F6CE80` | `#F3BE55` | `#F0AD2B` | `#ED9D00` | `#BE7E00` | `#8E5E00` | `#5F3F00` | `#2F1F00` |
| positive (light) | `#E8F7DF` | `#D0F0BE` | `#B9E89E` | `#A2E07E` | `#8AD95D` | `#8AD95D` | `#5CA731` | `#457D25` | `#2E5418` | `#172A0C` |

Neutral alpha ramp exactly (light, base `03030A`): 1=`03`, 2=`05`, 3=`0F`, 4=`1A`, 5=`26`, 6=`40`, 7=`73`, 8=`A6`, 9=`D9` (hex alpha). Dark (base `FFFFFF`): 1=`0A`, 2=`0F`, 3=`1A`, 4=`26`, 5=`40`, 6=`59`, 7=`73`, 8=`A6`, 9=`D9`, 10=`D9`.

### 1.3 Component state colors (from `color/*.xml`)

| Component | Normal | Pressed | Disabled | Evidence |
|---|---|---|---|---|
| Brand button bg | `brand` | `brand_7` | `brand` @50% | `ref_button_brand_colors` |
| Primary button bg | `primary` | `primary_8` (bug value in light) | `primary` @50% | `ref_button_primary_colors` |
| Neutral button bg | `neutral_2` | `neutral_1` | `neutral_2` @50% | `ref_button_neutral_colors` |
| Critical button bg | `critical` | `critical_7` | `critical` @50% | `ref_button_critical_colors` |
| App bar action bg | `refBackground` | `brand_1` | bg @50% | `ref_action_default_colors` |
| App bar action glyph | `neutral_9` | `brand_8` | `neutral_9` @50% | `ref_action_default_texts` |
| List item bg | surface | `neutral_2` | - | `ref_list_item_colors` |
| Tile card bg | surface | `neutral_2` | - | `ref_tile_background_colors` |
| Drawer item bg | transparent | `neutral_2` | - | `ref_navigation_item_background` |
| Bottom nav icon/label | checked `refTextPrimaryColor`, else `neutral_8` | - | - | `ref_bottom_app_bar_item_colors` |
| Edit field text | `neutral_7` (not activated), `neutral_9` (activated) | - | `neutral_5` | `ref_edit_field_text` |

---

## 2. Typography

Fonts (files in `res/font/`, copy as assets): `ubuntu_regular.ttf` (400), `ubuntu_medium.ttf` (500), `monorale_semibold.ttf` (600), `monorale_bold.ttf` (700), `bebasneuepro_book.ttf` (numbers), `ubuntumono_regular.ttf` (terminal), `lcd.ttf` (LCD widget), `icons.ttf` (icon font), `roboto_medium_numbers.ttf` (unused alias, GUESS). Family aliases: `font/ref_regular|medium|semibold|bold|number|lcd|icons.xml`.

Letter spacing: none of the `Ref.TextAppearance.{Body,Headline,Subtitle,Number}*` styles set `letterSpacing` -> 0. Only the Material3-derived appearances (`BodyLarge`, `TitleMedium`, `LabelLarge`...) inherit M3 defaults and just swap the font family (GUESS: M3 spec letter spacing, not used in the layouts read).

| RN token | Android style (values/styles.xml) | Size / line height | Font | Used for |
|---|---|---|---|---|
| Headline1 / "Title" (app bar) | `Ref.TextAppearance.Headline1` | 20sp / 26 | Monorale Bold 700 | App bar title (`RefAppBarLayout.Title`), toolbar title |
| Headline2 / dialog title | `Headline2` | 20sp / 26 | Monorale SemiBold 600 | Alert title, empty-state title, sheet title |
| Headline3 | `Headline3` | 18sp / 24 | Monorale SemiBold | - |
| Headline4 / tile title | `Headline4` | 16sp / 22 | Monorale SemiBold | Device tile title (2 lines) |
| Body1 | `Body1` | 16sp / 22 | Ubuntu Regular | List titles, edit fields, widget-picker rows |
| Body2 | `Body2` | 14sp / 18 | Ubuntu Regular | Default value widgets, empty-state text |
| Body3 / "Caption" / widget label | `Body3` | 12sp / 16 | Ubuntu Regular | Widget label (color neutral8, 1 line, no ellipsize), subtitles, inactive nav label |
| Subtitle1 / "Button" | `Subtitle1` | 16sp / 22 | Ubuntu Medium 500 | Buttons (`Ref.Components.Button.*`), list values |
| Subtitle2 | `Subtitle2` (link color brand-ish) | 14sp / 18 | Ubuntu Medium | App bar text actions, toggle buttons |
| Subtitle3 | `Subtitle3` | 12sp / 16 | Ubuntu Medium | Active nav label, chip text |
| Uppercase1 / 2 | `Uppercase1` / `Uppercase2` | = Body2 / Body3, ALL CAPS | Ubuntu Regular | Chart summary labels |
| Number (small) | `Number` (`refTextAppearanceNumberSmall`) | 16sp / 20 | Bebas Neue Pro Book | Widget values, slider value |
| NumberMedium / Large / ExtraLarge | same names | 32/40, 40/48, 48/56 | Bebas Neue Pro Book | Big numbers |
| Icon Small / Default / Medium / Large | `Icon.*` (`@dimen/ref_default_icon_*_size`) | 14sp / 16sp / 24sp / 44sp | `icons.ttf` | Glyph text |
| Terminal text | layout `ref_widget_terminal` | 12sp / 16 | Ubuntu Mono | Terminal |
| Tile gauge value | theme `refTileGaugeValueSize` | 32sp | Bebas | Tile gauge |

Widget font-size options (`FontSize` enum: AUTO, SMALL, MEDIUM, XMEDIUM, LARGE, XLARGE, XXLARGE) map to a factor of the max text size (`p177j6/b.java`, text-style widgets): AUTO 2.0 (auto-fit), XXLARGE 1.59, XLARGE 1.2, LARGE 0.9, XMEDIUM 0.75, MEDIUM 0.6, SMALL 0.5. Other helpers: `p177j6/c.java` (AUTO 2.0, L/XL/XXL 1.0, M/XM 0.7... actually M/XM 0.7, S 0.6) and `p177j6/j.java` (AUTO..XXL 2.0, M/XM 1.0, S 0.7). What the factor multiplies is **GUESS** (max text size computed from the cell, see 5.3).

---

## 3. App bar, navigation, screens

### 3.1 App bar
Styles: `Ref.Components.RefAppBarLayout*`, layouts `ref_app_bar_*.xml`, `ref_app_bar_collapsing.xml`, `ref_app_bar_device.xml`.

| Property | Value | Evidence |
|---|---|---|
| Background | `refBackgroundColor`; list screens (`contentDesign=list`) use `refListBackgroundColor` | `RefAppBarLayout`, `Logo`, `fr_tile_list_available` |
| Lift on scroll | yes (`liftOnScroll=true`), top bar elevation 4dp | `ref_default_topbar_elevation` |
| Collapsing large title | Title row sits 48dp below the pinned toolbar (`ref_default_titlebar_margin_top`), scrolls away, toolbar pinned | `ref_app_bar_collapsing` |
| Title | Headline1 (20sp bold), 1 line, color light `neutral9`, dark `#FFFFFF` (`refAppBarContentDefaultColor`) | `Ref.Components.RefAppBarLayout.Title` |
| Toolbar height | 48dp (`ref_default_actionbar_height`; Material `actionBarSize` 56dp is the fallback for `Toolbar` style) | dimens |
| Horizontal padding | 16dp (`ref_default_appbar_horizontal_padding`), 9dp for actionbar variant | dimens |
| Action button | 32dp box (`ref_default_action_button_size`), radius 8dp, glyph 17, padding 7, bg = screen bg, pressed bg `brand_1`, no ripple | `IconAction.Default` |
| Text action | Subtitle2 14sp, padding 8dp, icon 18dp | `TextAction.Default` |
| Primary action (icon) | filled primary, same 32dp box | `IconAction.Primary` (colors not read - GUESS) |
| Logo variant (device list) | Logo image height 32dp, max width 64dp, centered; nav icon slot 32x32 left; actions right | `ref_app_bar_logo_action_layout`, `ref_default_actionbar_logo_*` |
| Tab colors | selected: light `neutral9`, dark white; unselected `neutral7` | theme `refAppBarTab*` |

### 3.2 Bottom navigation
`RefBottomNavigationView` style `Ref.Components.BottomNavigationView` (parent `Widget.Material3.BottomNavigationView`), host `layout/ref_fr_navigation*.xml`.

| Property | Value |
|---|---|
| Background | surface (`backgroundTint=?refSecondaryBackgroundColor`) |
| Elevation | 16dp (`ref_default_bottombar_elevation`) |
| Icon | 24dp, from icon font drawable (`ref_default_bottombar_icon_size`) |
| Active indicator | 24 x 24dp (effectively no pill) |
| Label mode | always labeled; active label Subtitle3 (12sp medium), inactive Body3 (12sp regular) |
| Item padding bottom | 24dp, icon padding 0, no ripple |
| Colors | checked = `refTextPrimaryColor` (light `#262957`, dark `#24C48E`); unchecked = `neutral8` |
| Landscape | `NavigationRailView` on the left instead (`ref_fr_navigation_landscape.xml`) |
| Visibility | Only shown when the tab list has **2 or more** tabs (`p289pa/q.java` lambda: `sVarArr.length >= 2`) |

Tab list in THIS build: the tab factory (`p434xb/l.java`, bound in `p416wb/F1.java`) returns exactly one tab: title `title_devices` = "Devices", icon glyph `icon_cube` (U+E874, same glyph selected/unselected). So the bottom bar is **hidden** in the reference package. The shell code (`ShellViewModel.d0`, `p325ra/*`) also defines Automations (`bl_view_automations`), Group list, Clients (partner orgs), Notifications/Timeline and Profile tab classes that are not instantiated here; their glyph pairs use `icon_<name>` / `icon_<name>_selected` (available selected variants in the font: `bell_selected`, `cog_selected`, `console_selected`, `document_selected`, `grid_selected`, `lamp_selected`, `spray_selected`, `sun_selected`, `users_selected`). **GUESS** for a clone with tabs: Devices `cube`, Automations `sun2`(`sun_selected`), Notifications `bell`(`bell_selected`), Profile `user`.

### 3.3 Side drawer (the real secondary navigation)
Layouts `ref_fr_menu_start_*` (drawer width `ref_menu_width` = 270dp, 320dp on sw360dp+), content slides with `translationX`, content elevation 16dp, scrim `neutral6` (opened), drawer bg `refBackgroundColor`. Header logo: 24dp margin, height 56dp..96dp (`fr_menu_navigation`). List padding 16dp. Items (`p434xb/g.java`, strings resolved):

| # | Item | Icon glyph | String |
|---|---|---|---|
| 0 | Profile header | `icon_user` U+E71E (dev: `icon_developer` U+E9FF) | `title_profile` "My Profile" |
| 1 | Billing | `icon_credit_card` U+E759 | "Billing" |
| 2 | Organization | `icon_building8` U+E60C | `title_permission_organizations` "My Organization" |
| 3 | Organizations (hierarchy) | `icon_tree2` U+E883 | org term |
| 4 | Settings | `icon_gear` U+E672 | "Settings" |
| 5 | Help | `icon_help` U+E7ED | "Help" |
| 6 | About | `icon_about` U+E6D6 | "About" |
| 7 | Log out | `icon_exit` U+E6D3 | "Log out" |

Drawer item = `RefMaterialButton` (`navigation_item.xml`, style `?refButtonNavigationStyle`; colors **GUESS** neutral8 text + pressed `neutral2`).

### 3.4 Screens
| Screen | Layout | Structure |
|---|---|---|
| Devices (tile list) | `fr_tile_list_available.xml` | `SimpleLogoAppBarLayout` + SwipeRefresh + `TileRecyclerView` (2 columns, theme `refTileColumnsCount=2`) on list bg |
| Devices empty | `fr_tile_list_empty.xml`, style `Ref.UI.Tiles.Empty` | see 4.2 |
| Automations list | `ref_fr_automation_list(_screen).xml` | App bar + SwipeRefresh + RecyclerView `GridLayoutManager`, padding 8dp (`ref_default_list_padding`), card image ratio 2:1, card = image + title + description + date + enabled switch (44x22) |
| Automations empty | `Ref.UI.Automation.Empty` | icon `icon_sun2`, title "No automations yet", text "Automations let you set up actions that start when a certain trigger happens", primary button icon `icon_plus` "Create Automation" |
| Profile ("My Profile") | `ref_fr_profile.xml` | `CollapsingSimpleAppBarLayout` (list bg, title "My Profile") + RecyclerView `Ref.Components.List.NoBackground` (list bg, padding 8dp, bottom 34dp) |
| Developer zone / widget editor | `fr_constructor_widget_list.xml` | see 5 |

---

## 4. Device list

### 4.1 Tile card (`ref_default_tile_mode_*`, `devicetiles_tile_*`, `Ref.Components.Tile.*`)
| Property | Value | Evidence |
|---|---|---|
| Columns | 2 (`refTileColumnsCount`) | theme |
| Card | bg surface, stroke 1dp `neutral4`, radius 8dp, pressed overlay `neutral2`@2% | `Tile.Layout`, `ref_tile_background_colors` |
| List padding / card margin | 12dp list padding (`ref_default_tiles_padding`), 8dp card margin (`ref_default_tiles_list_margin`) | dimens |
| Inner margin | 16dp (`ref_default_card_margin`) left/right/top | dimens |
| Title | Headline4 (16sp semibold), `neutral9`, exactly 2 lines (min=max=2), ellipsize end | `Tile.Title` |
| Body area | Square `Space` below title (ratio `H,1:1` for 1-column tiles, `H,2:1` for 2-label tiles); content box = 40% of that height (`ref_default_tile_content_height_percent=0.4`) | `devicetiles_tile_page/labels` |
| Label | Body3, `neutral9`, 1 line | `Tile.Label` |
| Value | Number (Bebas 16sp), `neutral9`, 1 line | `Tile.Value` |
| Labels tile | up to 3 `LabelValueView` in a chain (`spread_inside`) | `devicetiles_tile_labels` |
| Button tile | icon 44dp + value, centered, 8dp gap | `devicetiles_tile_button`, `ref_default_tile_icon_size` |
| Gauge tile | gauge 80% width, value 32sp centered over it | `devicetiles_tile_gauge` |
| Switch tile | 44x22 switch | `devicetiles_tile_labels` |
| Status chip | `Chip.Neutral`: min height 24dp, padding 6dp, Subtitle3 12sp, fill `neutral2`, stroke 1dp `neutral3`, pill, text `neutral9` | `Ref.Components.Chip.Neutral` |

### 4.2 Empty state (`ref_icon_empty_layout.xml`, `Ref.Components.EmptyLayout.*`)
Vertical stack, centered horizontally, vertical bias 0.4, container padding 24dp.

| Element | Spec |
|---|---|
| Icon | glyph `icon_generic` (U+E874), IconLarge 44sp, color `refPrimaryColor`, margin-bottom 40dp |
| Title | Headline2 (20sp semibold), `neutral9`, centered, side margin 32dp; "No devices yet" |
| Text | Body2, `neutral9`, centered, margin-top 8dp, side margin 32dp; "You don't have any devices connected yet" |
| Primary action | Solid primary button, margin-top 40dp, icon `icon_plus`, "Add new device" |
| Secondary action | Text primary button, margin-top 8dp, icon `icon_tool`, "Developer Zone" |
| Background | list bg |

---

## 5. Dashboard (device screen, widget grid)

### 5.1 Grid model (`model/additional/GridMode.java`, `dashboard/H0.java#onMeasure`, `dashboard/GridDrawable.java`)

| | 24-column grid (default) | 8-column grid |
|---|---|---|
| Used when | dashboards/pages/headers; tile/group template `columns == 24` | tile/group template `columns != 24` |
| `columns` / `rows` | 24 / 400 | 8 / 100 |
| Cell width | `floor((W - 2*padH) / columns)` | same |
| Cell height | = cell width (square) | `floor(cellWidth * 1.35)` |
| Grid padding | 0 | 10dp horizontal and vertical |
| Horizontal offset | `(W - 2*padH - cellW*columns)/2` (leftover centered) | same |
| Height ratio (tabs) | 4 | 1 |
| Max widget size | 24 x 50 (`HEIGHT_MAX=50`, `WIDTH_MAX=24`) | 8 x 10 |

Widget position/size are stored as integers `x, y, width, height` in cells (`Widget.java`). Pixel box = `width*cellW` by `height*cellH`; the widget index is `y*columns + x`. Content scrolls vertically; the grid draws dots in edit mode only.

Widget chrome (all widget layouts): root `WidgetConstraintLayout` (style `Ref.UI.Widget.Layout`) padding 4dp (`ref_default_widget_padding`) on all sides; background style `Ref.Components.Dashboard.Widget.Background` (theme attr `refWidgetBackground`): fill surface, stroke 1dp `neutral3`, corner radius 0 (`Ref.ShapeAppearance.Widget`). Widget label (`refWidgetLabelTextStyle` = `Ref.Components.Dashboard.Widget.Label`): Body3 12sp, `neutral8`, 1 line, no ellipsize, `includeFontPadding=false`, padding-bottom 4dp, spans width at top; content fills the rest. Label text alignment from `Widget.labelAlignment` (LEFT default). Hidden/disabled flags exist per widget (`isHidden`, `isDisabled`).

### 5.2 Edit mode (`EditableWidgetsDashboardLayout`, `fr_constructor_widget_list.xml`)
| Element | Spec | Evidence |
|---|---|---|
| Grid dots | radius 1dp, color `neutral5`; active cells (under drag/resize) radius 2dp color `brand`; extra dot on the right edge | `GridDrawable`, `C2206b0.K()` |
| Selection outline | rect, 1dp stroke `brand` (focused `brand_7`), radius 4dp | `ref_default_widget_selection.xml` |
| Drag actions bar | header with 2 equal-weight buttons: Duplicate (`icon_copy`, bg `brand`, selected `primary`), Delete (`icon_trash`, bg `brand`, selected `critical`); glyph IconMedium 24sp white | `ref_default_dashboard_layout_header`, `ref_dashboard_button_*` |
| Toolbox (floating) | pill (circle shape), padding 4dp, bg `neutral9`, stroke 1dp white@~65%, centered bottom, margin-bottom 24dp; buttons 40dp circles, glyph 16sp: primary (`brand` bg, `refOnBrand` glyph) = add `icon_plus`; default (white-ish bg, glyph = surface color) | `Ref.Components.Toolbox*`, `ref_default_toolbox_button_size=40dp` |
| Empty state | title "No widgets yet", text "Start adding widgets by tapping anywhere on the grid or + button in the toolbox below"; side padding 48dp, top/bottom 24dp, no background | `Ref.UI.Dashboard.EditEmpty` |
| Add widget | Tap on grid cell or toolbox `+` -> Widget Box bottom sheet | strings |
| Resize | per-widget min/max (tables in 6); `ResizeSupport` = NONE / HORIZONTAL / VERTICAL / BOTH computed as `min != max` per axis (`WidgetSize.DefaultImpls`) | `WidgetSize.java` |
| Editor screen | Opens `WidgetEditActivity` (fragment list of setting rows, `Ref.Components.List.NoBackground`, list bg) on tap | `act_constructor_widget_edit`, `fr_constructor_widget_editor` |

### 5.3 Widget picker "Widget Box" (`fr_constructor_widgets_menu.xml`, `widget_menu_item.xml`, `A5/u.java`)
Bottom sheet (`Ref.Components.BottomSheet`: bg surface, large radius 8dp top corners, handle `ic_ref_default_bottom_sheet_handle` tinted `neutral4`, 16dp top margin).

| Element | Spec |
|---|---|
| Title | "Widget Box", `Text.Alert.Title` (Headline2, `neutral9`), margin-top 24dp, side 24dp |
| List container | margin 8dp, bg surface, radius 8dp, 1dp stroke `neutral2`, padding-top 8dp, bottom 34dp, row divider 1dp `neutral2` |
| Section header (`menu_header_group`) | 1dp separator `neutral3` (side margin 8dp), title Body3 `neutral6`, padding top 12dp / bottom 24dp, margin-start 8dp |
| Row (`widget_menu_item`) | min height 52dp, padding 8dp; icon box 48x48 (bg surface, stroke 1dp `neutral4`, radius 4dp); title Body1 `neutral8` max 2 lines (margin-start 8dp, end 12dp); trailing info glyph `icon_info` 20sp `neutral8`; pressed/selected bg `neutral2` radius 8dp |
| Icon tint by group | CONTROLLERS `brand`, DISPLAYS `primary`, INTERFACE `complimentary2`, OTHER `warning`, header widgets `positive` |
| Disabled row | title+icon alpha .5, small right-aligned label (`g.nf` / `O1` strings: unavailable / upgrade) |

Categories and order for the main (TILE/template) dashboard (`A5/u.java#e`); section titles `section_controllers`, `section_displays`, `section_interface`, `section_other`:

1. **Controllers**: Button, Styled Button, Icon Button, Image Button, Slider, Vertical Slider, Step Slider, Vertical Step Slider, Joystick, zeRGBa, RGB Light Control, Step H, Step V, Slope Control, Switch, Level Slider, Level Slider with Switch.
2. **Displays**: Value Display, Labeled Value, LED, Gauge, Radial Gauge, Enhanced Gauge, LCD, SuperChart, SimpleChart, Terminal, Video Streaming, Level H, Level V, Image Gallery, Gradient Ramp, Icon, Image Animation, Lottie Animation.
3. **Interface**: Menu, Map, Text Input, Numeric Input, Time Input, Segmented Switch, Icon Segmented Switch, Text, Formatted Text, Dynamic Spacer, (Table - only when flag `z10`).
4. **Other**: Music Player, WebPage Button, WebPage Image Button, Alias Name, (WebHook - only when flag).

Variants: PAGE dashboards (`A5/u.d`) drop Table/WebHook; GROUP dashboards (`A5/u.c`) show a reduced set: Controllers = Button, Styled Button, Icon Button, Image Button, Slider, Vertical Slider, Step Slider, Vertical Step Slider, Step H, Step V, Level Slider, Switch; Displays = Value Display, Labeled Value, LED, Gauge, Radial Gauge, Enhanced Gauge, SuperChart, SimpleChart, Level H, Level V, Gradient Ramp, Image Animation, Lottie Animation; Interface = Text, Formatted Text, Spacer. Header-line widgets have their own list (`B5/i.java`: Connection Status, Last Reported, [Tabs], Datastream Value, Image, Battery Level, Image Animation, Lottie Animation, [Tags]). `WidgetType` ordinal order is in `model/core/enums/WidgetType.java`.

---

## 6. Widgets

### 6.1 Shared layout skeleton
All layouts are in `layout/ref_widget_*.xml`; the inflater mapping is `dashboard/m0.java`. Root is `WidgetConstraintLayout` / `WidgetLinearLayout` / `WidgetFrameLayout` with `style=Ref.UI.Widget.Layout` (4dp padding). Pattern: `title` (label, top, full width, 4dp bottom padding) then a content view filling the remaining space (`0dp x 0dp`, constrained top = title bottom, bottom = parent bottom). Theme colors come from the widget's `ThemeColor {light, dark}` hex pair (default `#24C48E`, `ThemeColor.java`), choose by current theme.

Key shared control metrics: slider (`Ref.Components.Slider`): track height 4dp (`ref_default_progress_thickness`), track radius 4dp, active = `refPrimaryColor` (replaced by widget color), inactive = `neutral3`, thumb radius 20dp with 14dp ring stroke in `neutralWhite1`, thumb elevation 4dp, no halo, no ticks, no value label (`labelBehavior=gone`); switch (`RefSwitch`, widget `WidgetSwitch`): checked bg `refPositive` `#8AD95D`, unchecked `neutral6`, thumb white; list/tile size 44x22dp (`ref_default_switch_width_normal/height_normal`), small 28x16 padding 1dp; segmented/toggle (`Ref.Components.ToggleLayout`): track `neutral2`, padding 4dp, selected item bg `refPrimaryColor`, separator 1dp `neutral4`, radius 8dp, buttons Subtitle2 min 32dp, text `ref_button_toggle_text`.

### 6.2 Size table (cells)

Default / min / max in cells `WxH`. 24-col from `Columns24GridWidgetSizeFactory`, 8-col from `Columns8GridWidgetSizeFactory` (`min=def` where code says "default"). Fallback (any other type): 24-col 6x6 (max 24x50), 8-col 2x2 (max 8x10).

| Widget | 24-col default | 24-col min | 24-col max | 8-col default | 8-col min | 8-col max |
|---|---|---|---|---|---|---|
| Button | 6x6 | 3x3 | 24x50 | 2x2 (fallback) | 2x2 | 8x10 |
| Styled Button | 12x4 | 4x3 | 24x50 | 4x1 | 2x1 | 8x3 |
| Switch | 4x4 | 4x2 | 24x12 | 3x2 | 2x1 | 8x4 |
| Slider | 12x4 | 12x4 | 24x4 | 4x1 | 4x1 | 8x1 |
| Vertical Slider | 3x12 | 3x12 | 6x50 | 1x3 | 1x3 | 8x10 |
| Step H | 6x4 | 6x4 | 24x12 | 4x1 | 4x1 | 8x1 |
| Step V | 3x8 | 3x8 | 24x16 | 2x2 (fallback) | 2x2 | 8x10 |
| Level H | 8x4 | 4x1 | 24x50 | 3x1 | 3x1 | 8x10 |
| Level V | 3x8 | 1x4 | 24x50 | 1x3 | 1x2 | 8x10 |
| Level Slider | 6x16 | 6x16 | 24x36 | 4x4 | 4x2 | 8x10 |
| Segmented Switch | 12x4 | 8x2 | 24x6 | 8x1 | 8x1 | 8x1 |
| Menu | 12x4 | 8x4 | 24x8 | 4x1 | 2x1 | 8x3 |
| Value Display | 6x4 | 3x2 | 24x12 | 2x1 | 2x1 | 8x10 |
| Labeled Value | 6x4 | 3x2 | 24x12 | 4x1 | 2x1 | 8x3 |
| Gauge | 12x12 | 8x8 | 24x50 | 2x2 (fallback) | 2x2 | 8x10 |
| Radial Gauge | 8x8 | 3x3 | 24x50 | 3x2 | 3x2 | 8x10 |
| LED | 4x4 | 2x2 | 24x50 | 1x1 | 1x1 | 4x4 |
| Text (label) | 6x4 | 3x2 | 24x50 | 2x2 (fallback) | 2x2 | 8x10 |
| Numeric Input | 12x6 | 8x4 | 24x8 | 4x1 | 2x1 | 8x3 |
| Text Input | 12x4 | 8x4 | 24x8 | 4x1 | 2x1 | 8x3 |
| zeRGBa | 12x12 | 12x12 | 24x18 | 2x2 (fallback) | 2x2 | 8x10 |
| Joystick | 12x12 | 12x12 | 24x24 | 5x3 | 4x3 | 8x10 |
| Terminal | 24x14 | 20x14 | 24x50 | 8x3 | 8x3 | 8x10 |
| SimpleChart | 24x14 | 20x14 | 24x50 | 8x4 | 8x4 | 8x10 |
| Image (Gallery) | 12x12 | 1x1 | 24x50 | 4x4 | 2x1 | 8x10 |
| Dynamic Spacer | 24x2 | 24x1 | 24x24 | 8x1 | 8x1 | 8x5 |

### 6.3 Widget details

Settings fields are the row titles from the editor classes (rows built in `Q0(...)` methods, e.g. `p445y4/a.java`), strings resolved from `strings.xml`. Every editor starts with the base group from `p391v4/E.java`: header "Title", text field "Title" (optional for some types), "Alignment" (left/center/right). Rows labelled (Data) live in the "Data" tab class (`AbstractC3004s`: header "Data", row "Datastream"), (Settings) in the settings/events tab (events section "Widget usage tracking": "Send events to analytics when the trigger happens"). Colors rows open the shared color picker (already copied); each color row has a light and a dark value ("Configure the appearance of the widget for both dark and light themes").

| Widget | Layout xml + structure | Visual / interaction notes | Settings fields |
|---|---|---|---|
| **Button** (`BUTTON`) | `ref_widget_default_button`: label + `ShapeChildrenLayout` (`button_layout`) which inflates one of 12 button layouts below. Default variant = Solid + Rounded (`p084e6/j.d` default -> `ref_widget_button_style_solid_rounded`) | Mode `ButtonType` PUSH / SWITCH / PAGE / QR. Text shown = OFF/ON label. Fill = widget color; disabled = 50% | Labels: "OFF", "ON" (hints show datastream min/max); Font size; Color; Data: "Off/On values" (checkbox "Use datastream's Min/Max", OFF, ON); Settings (PAGE mode): "Close this page", "Page" -> "Select Page", "Appearance Animation"; events section |
| **Styled Button** (`STYLED_BUTTON`, same 12 variants + CUSTOM edge) | `ref_widget_button_style_<style>_<edge>.xml` = one `WidgetRefMaterialButton`, `match_parent x wrap_content`, style `Ref.UI.Widget.Button.<Style>.<Edge>`. 4 styles x 3 edges = 12: **Solid / Outlined / SolidStroke / Text** x **Pill / Rounded / Sharp** | Common: Subtitle1 text (16sp Ubuntu Medium), `textAllCaps=false`, insets 0, padding L/R 4dp (`widget_margin_xsmall`), T/B 4dp, no elevation, no ripple, 1 line, `ellipsize=none` (Text variant: `end`), icon size 16dp, icon padding 4-10dp. Edge: **Pill** radius 50%, **Rounded** radius 8dp (medium component), **Sharp** 0%, CUSTOM = "Corners Radius" setting. Style: **Solid** filled `backgroundTint`, text on-container; **SolidStroke** filled + 1dp stroke (`ref_default_stroke`); **Outlined** transparent + 1dp stroke (`mtrl_btn_stroke_size`), text `mtrl_text_btn_text_color_selector`; **Text** transparent, padding L/R 12dp. Mapping code `p084e6/j.c(style, shape, edge)`; SolidStroke/Sharp and /Pill reuse same layout ids in places | Labels: ON/OFF text + icon (button icon style NONE/START), text colors; "Style" (`ButtonStyle`: Solid, Outline, Solid+stroke, Text); "OFF Background", "ON Background"; "Shape" (Edge); "Hug content" ("Widget size will be defined by the size of the ON/OFF labels"); Data off/on values |
| **Switch** (`SWITCH`) | `ref_widget_switch`: label + `WidgetSwitch` (0x0, fills) | Track checked `ON color`, unchecked `OFF color`, thumb "Handle" color; size Auto (fit cell) or Fixed (44x22) | Style: "ON color", "OFF color", "Handle" colors; "Size": Auto / Fixed; Data: Off/On values; Events: "Switch turned on", "Switch turned off" |
| **Slider** | `ref_widget_slider` (value left, `...slider_value_left/right` variants): `value` (NumberSmall, `neutral`, 4dp margins) + `SliderView` (horizontal) next to it, below label | Material3 slider look (6.1), value text can be left/right/hidden | Style: color; Value: "Visible" + alignment; Data: "Min/Max values" (use datastream's), Min, Max; Settings: "Send on release" |
| **Vertical Slider** | `ref_widget_vertical_slider` `WidgetLinearLayout` (side padding 0): label (padding L/R `@dimen/widget_padding`), optional `value` centered (hidden by default), `SliderView` vertical weight 1 (6dp side margins) | | same as Slider |
| **Step Slider / Vertical Step Slider** | `ref_widget_step_slider` (value + `-` button + `StepSliderView` + `+` button) / `...vertical_step_slider` | Buttons are `WidgetStepButton` text glyph `icon_minus` / `icon_plus` (IconDefault 16sp), padding 4dp, transparent bg | Style color; Value visible; Data Min/Max; Settings: "Step", "Send on release" |
| **Step H / Step V** (`STEP`, `VERTICAL_STEP`) | `ref_widget_step` / `ref_widget_vertical_step`: `Flow` of [`-`/`+` buttons + 1dp divider]; divider bg `neutral4`, margin 4dp, buttons `icon_minus`/`icon_plus` (V uses plus on top) | Spread across the widget | Style: Icons ("↑↓" or "⁺/₋"), Color; Settings: "Step", "Send step", "Loop values"; Data Min/Max |
| **Level** (`LEVEL_DISPLAY`, `VERTICAL_LEVEL_DISPLAY`) | `ref_widget_level_display`: label + `LevelView` fill (V variant same view rotated) | Bar fill uses color; optional custom background | Style: "Flip Axis", Color, "Custom Background Color" + "Background color", "Shape"; Data Min/Max |
| **Level Slider** (+ with Switch) | `ref_widget_level_slider(_with_switch)`: `WidgetFrameLayout` padding 20dp, `LevelSliderView` fills, elevation 10dp | Segmented progress bar with handle | Colors: "Progress" Solid/Gradient, "Progress color", "Progress gradient", "Bottom segment color", "Handle", "Shape", "Corners Radius"; Settings: "Number of segments", "Fill", "Unconnect bottom segment", "Send on release"; Data: LEVEL datastream, "Button" |
| **Segmented Switch** | `ref_widget_segmented_control` `WidgetLinearLayout` vertical: label + `RefToggleLayout` (itemFullHeight) (Icon variant: `itemTextAppearance=IconDefault`) | See toggle metrics 6.1; selected item = "Active Option Color" | Style; "Active Option Color"; Options: "Enter %s", "Add option" (+ icons); Events: "Value changed" |
| **Menu** | `ref_widget_menu`: label + `WidgetRefMaterialEditText` (`inputType=none`, not focusable, end icon `icon_chevron_down`, 1dp vertical padding) | Tap opens option list | Value: "Make a selection…" placeholder; "Text Color", "Button Color"; Menu Items: "Item %d", "Add item"; Events: "Selection changed" |
| **Value Display** (`DIGIT4_DISPLAY`) | `ref_widget_default_value`: label + `WidgetRefMaterialTextView` (Body2, `gravity start|center`, 1 line, ellipsize end) filling; font size auto-fits (`FontSize`) | Number format/units from datastream | Value: Font size, Color; Data: Datastream |
| **Labeled Value** | same layout `ref_widget_default_value` | Shows text formatted with `/value/` | Value: "e.g: Temp: /value/" format field, Alignment, Font size, Color |
| **Text** (`TEXT`; "Formatted Text" uses `ref_widget_styled_text`) | `ref_widget_styled_text`: label + `RefMaterialTextView` Body2 centered, up to 10000 lines | Static text | Value: "Input value here" text, Alignment, Font size, Color, "Height", "Hug content" |
| **Gauge** | `ref_widget_gauge`: label + `GaugeView` (NumberSmall text) | Custom-drawn arc; style Material | Value: font size, Color; Data Min/Max |
| **Radial Gauge** | `ref_widget_radial_gauge`: label + `RadialGaugeView` | Custom-drawn full circle ring | Style: Color; "Show value" + font size; "Show label" + "Label" |
| **LED** | `ref_widget_led` `WidgetLinearLayout`: label (4dp bottom margin) + `View led_state` fills (drawn by `LEDDrawable`) | Circle in widget color, brightness by value | Style: Color; Data: datastream |
| **Numeric Input** | `ref_widget_number_input`: label + `WidgetRefNumberInputLayout` (stepper: edit field + buttons) | | Style: alignment + Color; Settings: "Step", "Loop values"; Events "Value changed" |
| **Text Input** | `ref_widget_text_input`: label + `WidgetRefMaterialEditText` (`maxLines=1`, `inputType=text`, `imeOptions=actionSend`, 1dp vertical padding) | | Value: "Hint" ("Input value here"), "Character Limit", alignment, Color |
| **zeRGBa** (`RGB`) | `ref_widget_rgb`: label + 3 value labels R/G/B (`minEms=2`, 8dp margins, colors `#DA6277`/`#8AD95D`/`#3595D4`, label style) top-right, `RGBView` color picker (16dp top margin) filling | Hue/brightness picker | Data: Mode Simple/Advanced, 1 or 3-4 datastreams; Settings: "Send on release" |
| **Joystick** | `ref_widget_joystick`: label + `JoystickView`; `Ref.Components.Dashboard.Widget.JoystickView`: field fill `neutral3`, field stroke 6dp `neutralWhite1`, handle stroke 4dp white | | Style: Color; Data: Mode Simple/Advanced + 2 datastreams; Settings: "Autoreturn", "Rotate on tilt"; per-axis: "%s-axis name", "%s Min", "%s Max", "%s Move Step", "%s Grid Step"; "Send on release" |
| **Terminal** | `ref_widget_terminal`: label + `TerminalTextView` (12sp Ubuntu Mono, line height 16sp, text white, bg `refNeutralColor`, padding 16dp, vertical scrollbar 2dp, gravity bottom) + `TerminalEditText` (same font/bg, hint "Type here", margin-top 4dp, `actionSend`) | Black (light) terminal; bg is `neutral` = `#03030A` light / `#D9FFFFFF` dark (so light text on white-ish in dark: **GUESS** the color is overridden by "Background color" setting) | Style: "Background color", "Text Color Mode" (Simple/Advanced), "Light text color", "User input color", "Hardware input color"; Settings: "Input Line", "Add newline", "Autoscroll", "Show timestamps" |
| **SimpleChart** | `ref_widget_simple_graph`: Subtitle1 title (top-left, 2 lines), summary block top-right (Uppercase1 label + NumberSmall value, swaps to highlight on touch), `SimpleChart` fills, bottom row: `GraphPeriodPickerView` (left) + expand glyph `icon_expand4` (right, `Icon.Small.Primary`); root side padding 0 | | Title, Alignment, Color, "Chart style" (line/area/columns/step/binary), "Color" Solid/Ramp, "Chart color", "Chart gradient", "Line width", "Line smoothing", "Min/Max Values" (Hide/Floating/On Y-Axis), "Time axis", "Zero line", "Value and Summary" (Summary + Color), "Units"; Time Ranges (7 max); "Y-axis scaling"; Top/Bottom/Delta; Settings: "Allow full screen mode", "Allow data scrolling", "Connect missing data points" |
| **Image** (Image Gallery) | `ref_widget_image` `WidgetLinearLayout` vertical: label (4dp bottom margin) + `WidgetImageView` `scaleType=centerInside` | | Style: image scaling (fit / fill ...) |
| **Spacer** (Dynamic Spacer) | `ref_widget_spacer`: ConstraintLayout padding 1dp; shows (edit mode only? **GUESS**) weight label (Body3 `neutral7`, auto-size 10-12sp, right-aligned, margin-end 16dp) and a 30dp-wide stretched image | No settings, only resize (24x2 default) | none (Title not editable) |

---

## 7. Dialogs and form styles

| Element | Spec | Evidence |
|---|---|---|
| Text field (`Ref.Components.EditText`) | min height 48dp, padding L/R 16dp, text Body1, fill `neutral2`, stroke 1dp `neutral3`, radius 8dp, hint `neutral6`, text `neutral7`->`neutral9` when active, error stroke `colorError`, disabled text `neutral5`, drawable padding 8dp | styles.xml |
| In-list text input | `RefTextInputLayout`, horizontal padding 4dp, `imeOptions=actionDone` | `ref_list_item_text_input` |
| Icon button (field-sized) | 48x48, same fill/stroke/radius | `Ref.Components.IconButton` |
| Settings row (list item) | row min vertical padding 24dp top/bottom, 16dp horizontal, bg surface, radius 4dp, stroke `neutral2`, pressed `neutral2`; title Body1 `neutral9`, subtitle Body3 `neutral8` (margin-top 4dp), trailing value Subtitle1 `neutral10` (`Ref.Components.ListItem*`, `Text.ListItem.*`) | styles.xml |
| Switch row | title(+subtitle) left, `RefSwitch` 44x22 right, 16dp gap; optional checkbox 24dp left | `ref_list_item_check_switch`, `title_subtitle_switch` |
| Color row | title + 40dp circle color button (`ref_default_circle_color_button_size`) | `ref_list_item_title_color` |
| Check/radio size | 24dp, stroke 2dp | dimens |
| Section header in settings list | header text (`Ci`="Title" style rows) then rows; list bg `refListBackground`; list padding 8dp, bottom 34dp | `Ref.Components.List.NoBackground` |
| Alert dialog | `Ref.Components.AlertDialog` (Material3 alert): bg `colorSurfaceContainerHigh`, extra-large corner shape (overlay 8dp medium), title Headline2 (20sp semibold, `neutral9`, start aligned), body Body1 `neutral9`, buttons `Ref.Components.Button.Text.Dialog`: Subtitle1, **ALL CAPS**, min width per M3, 1 line; dialog min width 75% (major) / 95% (minor) | `ref_default_dialog_min_width_*`, `Text.Alert.*` |
| Bottom sheet | surface bg, handle, title Headline2 margin 24dp, optional subtitle Body3 `neutral8`, list divider `neutral2`; options list padding 16dp bottom 24dp | `ref_options_bottom_sheet_dialog` |
| Buttons (non-widget) | `Button.Solid`: Subtitle1, padding H 32dp (`ref_default_button_padding_hor`) / V 6dp, min height 48dp, radius 8dp; variants Primary (bg primary, text on-primary), Brand (bg brand), Neutral (bg `neutral2`, text primary), Critical (bg critical), Text (transparent, Subtitle1, brand/primary text, H padding 12dp) | styles.xml, `color/ref_button_*` |
| Chip | see 4.1 | |
| Snackbar | bg `neutral9`, 1dp stroke `neutral3`, radius 8dp; action = Text.Brand button | `Ref.Components.Snackbar` |
| Tooltip | bg `neutral`, text Body2 | `Ref.Components.Tooltip` |
| Color picker | already copied by the user | - |

---

## 8. Icon font (`font/icons.ttf`)
Glyphs are referenced as Unicode strings `icon_<name>` in `strings.xml`. Used above: `plus` U+E936, `minus` U+E937, `chevron_down` U+E93A, `chevron_up` U+E939, `chevron_left` U+E93B, `chevron_right` U+E93C, `info` U+E9ED, `expand4` U+E952, `copy` U+E6B8, `trash` U+E680, `search` U+E922, `gear` U+E672, `tool` U+E674, `user` U+E71E, `cube`/`generic` U+E874, `sun2` U+E648, `bell` U+E8AA, `credit_card` U+E759, `building8` U+E60C, `tree2` U+E883, `help` U+E7ED, `about` U+E6D6, `exit` U+E6D3, `check` U+E934, `cross` U+E92A, `edit` U+E60D, `menu` U+E92B, `refresh` U+E8D3, `wifi` U+E8B7. Full list: all 201 `icon_*` entries in `values/strings.xml`.

## 9. Open items / guesses
- Widget editor tab names (Appearance / Data / Settings) not read; grouping above is by editor class role.
- Button/Switch/Slider custom views (`GaugeView`, `RadialGaugeView`, `LevelView`, `RGBView`, `LEDDrawable`, `SimpleChart`) are canvas-drawn in code; only their style attrs were read (`Ref.Components.Dashboard.Widget.*`).
- Font-size factor basis, Spacer edit-mode appearance, drawer item colors, primary-action app bar colors: GUESS.
- Light `ref_primary_8` is `#D903030A` in the resources (looks like a copy-paste error); pressed primary buttons in light mode will show a near-black.
- Shell tabs other than Devices are present in code but not wired in this build (section 3.2).
