#!/usr/bin/env bash
#
# Creates a stable self-signed code-signing certificate in your login keychain so
# electron-builder can produce a *properly bound* macOS signature (correct bundle
# identifier + sealed resources). This makes the Accessibility / Microphone grant
# persist across launches instead of re-prompting every time.
#
# Run ONCE per machine:  bash build/create-self-signed-cert.sh
# Then build with:       CSC_NAME="Quoril Self Signed" npm run dist:mac
#
# NOTE: A self-signed cert is enough for personal / internal use. For public
# distribution you still need an Apple "Developer ID Application" certificate
# plus notarization (see build/README-signing.md).

set -euo pipefail

CERT_NAME="Quoril Self Signed"

if security find-certificate -c "$CERT_NAME" >/dev/null 2>&1; then
    echo "Certificate \"$CERT_NAME\" already exists. Nothing to do."
    exit 0
fi

TMPDIR_CERT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_CERT"' EXIT

cat > "$TMPDIR_CERT/cert.conf" <<EOF
[ req ]
distinguished_name = dn
x509_extensions    = ext
prompt             = no
[ dn ]
CN = $CERT_NAME
[ ext ]
basicConstraints       = critical,CA:false
keyUsage               = critical,digitalSignature
extendedKeyUsage       = critical,codeSigning
EOF

openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$TMPDIR_CERT/key.pem" \
    -out "$TMPDIR_CERT/cert.pem" \
    -days 3650 -config "$TMPDIR_CERT/cert.conf"

openssl pkcs12 -export \
    -inkey "$TMPDIR_CERT/key.pem" \
    -in "$TMPDIR_CERT/cert.pem" \
    -out "$TMPDIR_CERT/cert.p12" \
    -passout pass:

security import "$TMPDIR_CERT/cert.p12" -k ~/Library/Keychains/login.keychain-db \
    -T /usr/bin/codesign -P "" -A

# Trust the cert for code signing so codesign doesn't prompt.
sudo security add-trusted-cert -d -r trustAsRoot \
    -k /Library/Keychains/System.keychain "$TMPDIR_CERT/cert.pem" || \
    echo "(Could not add to system trust — local code signing still works.)"

echo ""
echo "Done. Now build with:"
echo "    CSC_NAME=\"$CERT_NAME\" npm run dist:mac"
