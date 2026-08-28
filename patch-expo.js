const fs = require("fs");
const path = "node_modules/expo/node_modules/@expo/cli/build/src/api/getNativeModuleVersions.js";
let code = fs.readFileSync(path, "utf8");

const patched = `async function getNativeModuleVersionsAsync(sdkVersion) {
    const fetchAsync = (0, _client.createCachedFetch)({
        cacheDirectory: 'native-modules-cache',
        ttl: 1000 * 60
    });
    try {
        const response = await fetchAsync(\`sdks/\${sdkVersion}/native-modules\`);
        if (!response.ok) return {};
        const text = await response.text();
        if (!text) return {};
        const json = JSON.parse(text);
        const data = (0, _client.getResponseDataOrThrow)(json);
        if (!data || !data.length) return {};
        return fromBundledNativeModuleList(data);
    } catch (e) {
        return {};
    }
}`;

code = code.replace(
  /async function getNativeModuleVersionsAsync[\s\S]*?^function fromBundledNativeModuleList/m,
  patched + "\n\nfunction fromBundledNativeModuleList"
);

fs.writeFileSync(path, code);
console.log("✓ Patched getNativeModuleVersions.js");
