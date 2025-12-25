#!/bin/bash
# TestFlight Build & Upload Script for SemaSlim

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SemaSlim TestFlight Build Script ===${NC}"
echo ""

# Configuration
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$PROJECT_DIR/ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="$PROJECT_DIR/build/SemaSlim.xcarchive"
EXPORT_PATH="$PROJECT_DIR/build/export"
EXPORT_OPTIONS="$PROJECT_DIR/ios/ExportOptions.plist"

# Check for required tools
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Error: xcodebuild not found. Please install Xcode.${NC}"
    exit 1
fi

# Step 1: Check for signing identity
echo -e "${YELLOW}Step 1: Checking code signing identity...${NC}"
IDENTITIES=$(security find-identity -v -p codesigning | grep -c "valid identit")
if [ "$IDENTITIES" = "0" ]; then
    echo -e "${RED}No valid code signing identities found.${NC}"
    echo ""
    echo "To fix this, you need to:"
    echo "1. Open Xcode → Settings → Accounts"
    echo "2. Select your Apple ID"
    echo "3. Click 'Manage Certificates'"
    echo "4. Click '+' and create 'Apple Distribution' certificate"
    echo ""
    echo -e "${YELLOW}After creating the certificate, run this script again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found signing identity${NC}"

# Step 2: Sync Capacitor
echo ""
echo -e "${YELLOW}Step 2: Syncing Capacitor project...${NC}"
cd "$PROJECT_DIR"
npm run mobile:sync
echo -e "${GREEN}✓ Capacitor synced${NC}"

# Step 3: Clean previous builds
echo ""
echo -e "${YELLOW}Step 3: Cleaning previous builds...${NC}"
rm -rf "$PROJECT_DIR/build"
mkdir -p "$PROJECT_DIR/build"
echo -e "${GREEN}✓ Build directory cleaned${NC}"

# Step 4: Archive
echo ""
echo -e "${YELLOW}Step 4: Archiving app (this may take a few minutes)...${NC}"
xcodebuild -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    -allowProvisioningUpdates \
    archive

if [ ! -d "$ARCHIVE_PATH" ]; then
    echo -e "${RED}Error: Archive failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Archive created at $ARCHIVE_PATH${NC}"

# Step 5: Export for App Store Connect
echo ""
echo -e "${YELLOW}Step 5: Exporting for App Store Connect...${NC}"
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -allowProvisioningUpdates

echo -e "${GREEN}✓ Export complete${NC}"

# Step 6: Upload to App Store Connect
echo ""
echo -e "${YELLOW}Step 6: Uploading to App Store Connect...${NC}"
echo "You will be prompted to enter your Apple ID and app-specific password."
echo ""
echo "To create an app-specific password:"
echo "1. Go to https://appleid.apple.com"
echo "2. Sign in → Security → App-Specific Passwords"
echo "3. Generate a password for 'Xcode Upload'"
echo ""

IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" -print -quit)
if [ -z "$IPA_FILE" ]; then
    echo -e "${RED}Error: No IPA file found in $EXPORT_PATH${NC}"
    exit 1
fi

echo "Uploading: $IPA_FILE"
xcrun altool --upload-app \
    -f "$IPA_FILE" \
    -t ios \
    --apiKey "${APPLE_API_KEY:-}" \
    --apiIssuer "${APPLE_API_ISSUER:-}" \
    2>/dev/null || \
xcrun altool --upload-app \
    -f "$IPA_FILE" \
    -t ios \
    -u "${APPLE_ID:-}" \
    -p "@keychain:AC_PASSWORD"

echo ""
echo -e "${GREEN}=== Build and Upload Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://appstoreconnect.apple.com"
echo "2. Navigate to your app → TestFlight"
echo "3. Wait for the build to finish processing"
echo "4. Add testers and start testing!"
