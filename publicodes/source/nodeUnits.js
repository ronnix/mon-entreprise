"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var temporal_1 = require("./temporal");
var units_1 = require("./units");
function simplifyNodeUnit(node) {
    if (!node.unit) {
        return node;
    }
    var unit = units_1.simplifyUnit(node.unit);
    return convertNodeToUnit(unit, node);
}
exports.simplifyNodeUnit = simplifyNodeUnit;
function convertNodeToUnit(to, node) {
    var temporalValue = node.temporalValue && node.unit
        ? temporal_1.mapTemporal(function (value) { return units_1.convertUnit(node.unit, to, value); }, node.temporalValue)
        : node.temporalValue;
    return __assign(__assign(__assign(__assign({}, node), { nodeValue: node.unit
            ? units_1.convertUnit(node.unit, to, node.nodeValue)
            : node.nodeValue }), (temporalValue && { temporalValue: temporalValue })), { unit: to });
}
exports.convertNodeToUnit = convertNodeToUnit;
