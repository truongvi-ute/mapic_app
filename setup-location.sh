#!/bin/bash

echo "🚀 Setting up Location Picker..."
echo ""

# Check if we're in frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Install MapLibre
echo "📦 Installing @maplibre/maplibre-react-native..."
npm install @maplibre/maplibre-react-native

if [ $? -ne 0 ]; then
    echo "❌ Failed to install MapLibre"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📱 Next steps:"
echo ""
echo "1. Rebuild your app (REQUIRED!):"
echo "   Android: npx expo run:android"
echo "   iOS:     npx expo run:ios"
echo ""
echo "2. Test the feature:"
echo "   - Open app"
echo "   - Go to 'Tạo khoảnh khắc' tab"
echo "   - Select 'Thư viện' tab"
echo "   - Tap 'Chọn địa điểm'"
echo "   - Select Province → District → Ward"
echo "   - See the map with draggable marker!"
echo ""
echo "📖 For more details, see QUICK_START_LOCATION.md"
echo ""
