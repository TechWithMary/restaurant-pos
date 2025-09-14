# POS Restaurant System Design Guidelines

## Design Approach
**Utility-Focused Design System Approach**: Using Material Design principles optimized for touch interactions and restaurant workflow efficiency. This is a productivity tool where speed, accuracy, and learnability are paramount.

## Core Design Elements

### Color Palette
**Light Mode Primary:**
- Primary: 25 85% 45% (Deep restaurant green)
- Surface: 0 0% 98% (Clean white background)
- Surface variant: 0 0% 95% (Card backgrounds)
- Success: 140 75% 45% (Order confirmation)
- Warning: 35 85% 55% (Price highlights)

**Dark Mode Primary:**
- Primary: 25 60% 65% (Softer green for dark mode)
- Surface: 0 0% 12% (Dark background)
- Surface variant: 0 0% 18% (Card backgrounds)
- Text: 0 0% 95% (High contrast text)

### Typography
- **Primary Font**: Inter via Google Fonts
- **Headers**: 600 weight, sizes 24px-32px
- **Body**: 400 weight, 16px-18px for readability
- **Prices**: 700 weight, emphasized sizing
- **Categories**: 500 weight, 14px

### Layout System
**Tailwind Spacing**: Use units of 2, 4, 6, and 8 for consistent spacing (p-4, m-6, gap-8)
- **Grid**: Three-column layout: 1fr 2fr 1fr ratio
- **Cards**: Minimum 120px height for touch targets
- **Buttons**: Minimum 48px height for accessibility

### Component Library

**Categories (Left Column):**
- Vertical list with 60px height items
- Icons from Heroicons (outline style)
- Active state with primary color background
- Clear visual feedback for selected category

**Product Cards (Center Grid):**
- 2-3 column responsive grid
- Cards with subtle shadows and rounded corners
- Touch-friendly 140px minimum height
- Price prominently displayed in success color
- Hover state with slight elevation

**Order Summary (Right Column):**
- Sticky header with order total
- Scrollable item list with quantity controls
- Large circular +/- buttons (48px minimum)
- Price calculations clearly separated
- Prominent "Enviar a Cocina" button (primary color, 56px height)

**Visual Hierarchy:**
- Category selection uses primary color prominence
- Product prices use success color for immediate recognition
- Order total uses larger typography and visual separation
- Critical actions (send to kitchen) use maximum visual weight

**Touch Optimization:**
- All interactive elements minimum 44px touch targets
- Generous spacing between clickable elements
- Clear visual feedback for all interactions
- Swipe gestures disabled to prevent accidental actions

**Tablet Vertical Optimization:**
- Fixed three-column layout prevents horizontal scrolling
- Category and order columns have fixed widths
- Product grid scrolls vertically only
- Bottom navigation/actions remain accessible

**Language Considerations:**
- Spanish text properly spaced and sized
- Currency formatting follows Spanish conventions (€)
- IVA calculation clearly labeled and separated
- Professional restaurant terminology throughout