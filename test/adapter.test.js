"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_sdk_1 = require("@maestro-org/typescript-sdk");
var maestro_1 = require("../src/adapters/maestro");
var asset_1 = require("../src/types/asset");
var constants_1 = require("../src/types/constants");
var network_1 = require("../src/types/network");
function mustGetEnv(key) {
    var val = process.env[key];
    if (!val) {
        throw new Error("".concat(key, " not found"));
    }
    return val;
}
var MIN_TESTNET = "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e";
var MIN_MAINNET = "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e";
var MIN_ADA_POOL_V1_ID_TESTNET = "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";
var MIN_ADA_POOL_V1_ID_MAINNET = "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";
// function getBlockfrostAdapters(): [Adapter, Adapter] {
//   const blockfrostAdapterTestnet = new BlockfrostAdapter(
//     NetworkId.TESTNET,
//     new BlockFrostAPI({
//       projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_TESTNET"),
//       network: "preprod",
//     })
//   );
//   const blockfrostAdapterMainnet = new BlockfrostAdapter(
//     NetworkId.MAINNET,
//     new BlockFrostAPI({
//       projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_MAINNET"),
//       network: "mainnet",
//     })
//   );
//   return [blockfrostAdapterTestnet, blockfrostAdapterMainnet];
// }
function getMaestroAdapters() {
    var cardanoNetworkPreprod = "Preprod";
    var maestroAdapterTestnet = new maestro_1.MaestroAdapter(network_1.NetworkId.TESTNET, new typescript_sdk_1.MaestroClient(new typescript_sdk_1.Configuration({
        apiKey: mustGetEnv("MAESTRO_API_KEY_TESTNET"),
        network: cardanoNetworkPreprod,
    })));
    var cardanoNetworkMainnet = "Mainnet";
    var maestroAdapterMainnet = new maestro_1.MaestroAdapter(network_1.NetworkId.MAINNET, new typescript_sdk_1.MaestroClient(new typescript_sdk_1.Configuration({
        apiKey: mustGetEnv("MAESTRO_API_KEY_MAINNET"),
        network: cardanoNetworkMainnet,
    })));
    return [maestroAdapterTestnet, maestroAdapterMainnet];
}
describe.each([
    __spreadArray(["Maestro"], getMaestroAdapters(), true),
])("Run test with %s adapter", function (_name, adapterTestnet, adapterMainnet) {
    test("getAssetDecimals", function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = expect;
                    return [4 /*yield*/, adapterTestnet.getAssetDecimals("lovelace")];
                case 1:
                    _a.apply(void 0, [_e.sent()]).toBe(6);
                    _b = expect;
                    return [4 /*yield*/, adapterTestnet.getAssetDecimals(MIN_TESTNET)];
                case 2:
                    _b.apply(void 0, [_e.sent()]).toBe(0);
                    _c = expect;
                    return [4 /*yield*/, adapterMainnet.getAssetDecimals("lovelace")];
                case 3:
                    _c.apply(void 0, [_e.sent()]).toBe(6);
                    _d = expect;
                    return [4 /*yield*/, adapterMainnet.getAssetDecimals(MIN_MAINNET)];
                case 4:
                    _d.apply(void 0, [_e.sent()]).toBe(6);
                    return [2 /*return*/];
            }
        });
    }); });
    function testPoolPrice(adapter) {
        return __awaiter(this, void 0, void 0, function () {
            var pools, i, idx, pool, _a, priceAB, priceBA;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, adapter.getV1Pools({ page: 1 })];
                    case 1:
                        pools = _b.sent();
                        expect(pools.length).toBeGreaterThan(0);
                        i = 0;
                        _b.label = 2;
                    case 2:
                        if (!(i < 5)) return [3 /*break*/, 5];
                        idx = Math.floor(Math.random() * pools.length);
                        pool = pools[idx];
                        return [4 /*yield*/, adapter.getV1PoolPrice({ pool: pool })];
                    case 3:
                        _a = _b.sent(), priceAB = _a[0], priceBA = _a[1];
                        // product of 2 prices must be approximately equal to 1
                        // abs(priceAB * priceBA - 1) <= epsilon
                        expect(priceAB.mul(priceBA).sub(1).abs().toNumber()).toBeLessThanOrEqual(1e-6);
                        _b.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    test("getPoolPrice", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testPoolPrice(adapterTestnet)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testPoolPrice(adapterMainnet)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, 10000);
    test("getV1PoolById", function () { return __awaiter(void 0, void 0, void 0, function () {
        var adaMINTestnet, adaMINMainnet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapterTestnet.getV1PoolById({
                        id: MIN_ADA_POOL_V1_ID_TESTNET,
                    })];
                case 1:
                    adaMINTestnet = _a.sent();
                    expect(adaMINTestnet).not.toBeNull();
                    expect(adaMINTestnet === null || adaMINTestnet === void 0 ? void 0 : adaMINTestnet.assetA).toEqual("lovelace");
                    expect(adaMINTestnet === null || adaMINTestnet === void 0 ? void 0 : adaMINTestnet.assetB).toEqual(MIN_TESTNET);
                    return [4 /*yield*/, adapterMainnet.getV1PoolById({
                            id: MIN_ADA_POOL_V1_ID_MAINNET,
                        })];
                case 2:
                    adaMINMainnet = _a.sent();
                    expect(adaMINMainnet).not.toBeNull();
                    expect(adaMINMainnet === null || adaMINMainnet === void 0 ? void 0 : adaMINMainnet.assetA).toEqual("lovelace");
                    expect(adaMINMainnet === null || adaMINMainnet === void 0 ? void 0 : adaMINMainnet.assetB).toEqual(MIN_MAINNET);
                    return [2 /*return*/];
            }
        });
    }); });
    function testPriceHistory(adapter, id) {
        return __awaiter(this, void 0, void 0, function () {
            var history, i, pool;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, adapter.getV1PoolHistory({ id: id })];
                    case 1:
                        history = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < Math.min(5, history.length))) return [3 /*break*/, 5];
                        return [4 /*yield*/, adapter.getV1PoolInTx({ txHash: history[i].txHash })];
                    case 3:
                        pool = _a.sent();
                        expect(pool === null || pool === void 0 ? void 0 : pool.txIn.txHash).toEqual(history[i].txHash);
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    test("get prices of last 5 states of MIN/ADA pool", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testPriceHistory(adapterTestnet, MIN_ADA_POOL_V1_ID_TESTNET)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testPriceHistory(adapterMainnet, MIN_ADA_POOL_V1_ID_MAINNET)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    test("getV2PoolByPair", function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapterTestnet.getV2PoolByPair(asset_1.ADA, {
                        policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
                        tokenName: "4d494e",
                    })];
                case 1:
                    pool = _a.sent();
                    expect(pool).not.toBeNull();
                    expect(pool === null || pool === void 0 ? void 0 : pool.assetA).toEqual("lovelace");
                    expect(pool === null || pool === void 0 ? void 0 : pool.assetB).toEqual(MIN_TESTNET);
                    return [2 /*return*/];
            }
        });
    }); });
    test("getAllV2Pools", function () { return __awaiter(void 0, void 0, void 0, function () {
        var pools;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapterTestnet.getAllV2Pools()];
                case 1:
                    pools = (_a.sent()).pools;
                    expect(pools.length > 0);
                    return [2 /*return*/];
            }
        });
    }); });
    test("getV2Pools", function () { return __awaiter(void 0, void 0, void 0, function () {
        var pools;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapterTestnet.getV2Pools({ page: 1 })];
                case 1:
                    pools = (_a.sent()).pools;
                    expect(pools.length > 0);
                    return [2 /*return*/];
            }
        });
    }); });
    test("getAllStablePools", function () { return __awaiter(void 0, void 0, void 0, function () {
        var numberOfStablePoolsTestnet, numberOfStablePoolsMainnet, testnetPools, mainnetPools;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    numberOfStablePoolsTestnet = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.TESTNET].length;
                    numberOfStablePoolsMainnet = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.MAINNET].length;
                    return [4 /*yield*/, adapterTestnet.getAllStablePools()];
                case 1:
                    testnetPools = (_a.sent()).pools;
                    expect(testnetPools.length === numberOfStablePoolsTestnet);
                    return [4 /*yield*/, adapterMainnet.getAllStablePools()];
                case 2:
                    mainnetPools = (_a.sent()).pools;
                    expect(mainnetPools.length === numberOfStablePoolsMainnet);
                    return [2 /*return*/];
            }
        });
    }); });
    test("getStablePoolByLPAsset", function () { return __awaiter(void 0, void 0, void 0, function () {
        var testnetCfgs, mainnetCfgs, _i, testnetCfgs_1, cfg, pool, _a, mainnetCfgs_1, cfg, pool;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    testnetCfgs = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.TESTNET];
                    mainnetCfgs = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.MAINNET];
                    _i = 0, testnetCfgs_1 = testnetCfgs;
                    _b.label = 1;
                case 1:
                    if (!(_i < testnetCfgs_1.length)) return [3 /*break*/, 4];
                    cfg = testnetCfgs_1[_i];
                    return [4 /*yield*/, adapterTestnet.getStablePoolByLpAsset(asset_1.Asset.fromString(cfg.lpAsset))];
                case 2:
                    pool = _b.sent();
                    expect(pool).not.toBeNull();
                    expect(pool === null || pool === void 0 ? void 0 : pool.nft).toEqual(cfg.nftAsset);
                    expect(pool === null || pool === void 0 ? void 0 : pool.assets).toEqual(cfg.assets);
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    _a = 0, mainnetCfgs_1 = mainnetCfgs;
                    _b.label = 5;
                case 5:
                    if (!(_a < mainnetCfgs_1.length)) return [3 /*break*/, 8];
                    cfg = mainnetCfgs_1[_a];
                    return [4 /*yield*/, adapterMainnet.getStablePoolByLpAsset(asset_1.Asset.fromString(cfg.lpAsset))];
                case 6:
                    pool = _b.sent();
                    expect(pool).not.toBeNull();
                    expect(pool === null || pool === void 0 ? void 0 : pool.nft).toEqual(cfg.nftAsset);
                    expect(pool === null || pool === void 0 ? void 0 : pool.assets).toEqual(cfg.assets);
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    test("getStablePoolByNFT", function () { return __awaiter(void 0, void 0, void 0, function () {
        var testnetCfgs, mainnetCfgs, _i, testnetCfgs_2, cfg, pool, _a, mainnetCfgs_2, cfg, pool;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    testnetCfgs = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.TESTNET];
                    mainnetCfgs = constants_1.StableswapConstant.CONFIG[network_1.NetworkId.MAINNET];
                    _i = 0, testnetCfgs_2 = testnetCfgs;
                    _b.label = 1;
                case 1:
                    if (!(_i < testnetCfgs_2.length)) return [3 /*break*/, 4];
                    cfg = testnetCfgs_2[_i];
                    return [4 /*yield*/, adapterTestnet.getStablePoolByNFT(asset_1.Asset.fromString(cfg.nftAsset))];
                case 2:
                    pool = _b.sent();
                    expect(pool).not.toBeNull();
                    expect(pool === null || pool === void 0 ? void 0 : pool.nft).toEqual(cfg.nftAsset);
                    expect(pool === null || pool === void 0 ? void 0 : pool.assets).toEqual(cfg.assets);
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    _a = 0, mainnetCfgs_2 = mainnetCfgs;
                    _b.label = 5;
                case 5:
                    if (!(_a < mainnetCfgs_2.length)) return [3 /*break*/, 8];
                    cfg = mainnetCfgs_2[_a];
                    return [4 /*yield*/, adapterMainnet.getStablePoolByNFT(asset_1.Asset.fromString(cfg.nftAsset))];
                case 6:
                    pool = _b.sent();
                    expect(pool).not.toBeNull();
                    expect(pool === null || pool === void 0 ? void 0 : pool.nft).toEqual(cfg.nftAsset);
                    expect(pool === null || pool === void 0 ? void 0 : pool.assets).toEqual(cfg.assets);
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/];
            }
        });
    }); });
});
