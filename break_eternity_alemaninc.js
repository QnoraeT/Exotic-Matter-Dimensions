"use strict";
(function (global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() :
		typeof define === "function" && define.amd ? define(factory) :
			(global = global || self, global.Decimal = factory());
}(this, function () { "use strict";

	var padEnd = function (string, maxLength, fillString) {

		if (string === null || maxLength === null) {
			return string;
		}

		var result		= String(string);
		var targetLen = typeof maxLength === "number"
			? maxLength
			: parseInt(maxLength, 10);

		if (isNaN(targetLen) || !isFinite(targetLen)) {
			return result;
		}


		var length = result.length;
		if (length >= targetLen) {
			return result;
		}


		var filled = fillString === null ? "" : String(fillString);
		if (filled === "") {
			filled = " ";
		}


		var fillLen = targetLen - length;

		while (filled.length < fillLen) {
			filled += filled;
		}

		var truncated = filled.length > fillLen ? filled.substring(0, fillLen) : filled;

		return result + truncated;
	};

	var MAX_SIGNIFICANT_DIGITS = 17; //Maximum number of digits of precision to assume in Number

	var EXP_LIMIT = 9e15; //If we're ABOVE this value, increase a layer. (9e15 is close to the largest integer that can fit in a Number.)
	
	var LAYER_DOWN = Math.log10(9e15); //If we're BELOW this value, drop down a layer. About 15.954.
	
	var FIRST_NEG_LAYER = 1/9e15; //At layer 0, smaller non-zero numbers than this become layer 1 numbers with negative mag. After that the pattern continues as normal.

	var NUMBER_EXP_MAX = 308; //The largest exponent that can appear in a Number, though not all mantissas are valid here.

	var NUMBER_EXP_MIN = -324; //The smallest exponent that can appear in a Number, though not all mantissas are valid here.
	
	var MAX_ES_IN_A_ROW = 5; //For default toString behaviour, when to swap from eee... to (e^n) syntax.

	var powerOf10 = function () {
		// We need this lookup table because Math.pow(10, exponent)
		// when exponent's absolute value is large is slightly inaccurate.
		// You can fix it with the power of math... or just make a lookup table.
		// Faster AND simpler
		var powersOf10 = [];

		for (var i = NUMBER_EXP_MIN + 1; i <= NUMBER_EXP_MAX; i++) {
			powersOf10.push(Number("1e" + i));
		}

		var indexOf0InPowersOf10 = 323;
		return function (power) {
			return powersOf10[power + indexOf0InPowersOf10];
		};
	}();

	var D = function D(value) {
		if (value==undefined) throw "invalid Decimal"
		return Decimal.fromValue_noAlloc(value);
	};

	var FC = function FC(sign, layer, mag) {
		return Decimal.fromComponents(sign, layer, mag);
	};

	var FC_NN = function FC_NN(sign, layer, mag) {
		return Decimal.fromComponents_noNormalize(sign, layer, mag);
	};
	
	var ME = function ME(mantissa, exponent) {
		return Decimal.fromMantissaExponent(mantissa, exponent);
	};

	var ME_NN = function ME_NN(mantissa, exponent) {
		return Decimal.fromMantissaExponent_noNormalize(mantissa, exponent);
	};
	
	var decimalPlaces = function decimalPlaces(value, places) {
		var len = places + 1;
		var numDigits = Math.ceil(Math.log10(Math.abs(value)));
		var rounded = Math.round(value * (10 ** (len - numDigits))) * (10 ** (numDigits - len));
		return parseFloat(rounded.toFixed(Math.max(len - numDigits, 0)));
	};
	
	var f_maglog10 = function(n) {
		return Math.sign(n)*Math.log10(Math.abs(n));
	};
	
	//from HyperCalc source code
	var f_gamma = function(n) {
		if (!isFinite(n)) { return n; }
		if (n < -50)
		{
			if (n === Math.trunc(n)) { return Number.NEGATIVE_INFINITY; }
			return 0;
		}
		
		var scal1 = 1;
		while (n < 10)
		{
			scal1 = scal1*n;
			++n;
		}
		
		n -= 1;
		var l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
		l = l + (n+0.5)*Math.log(n);
		l = l - n;
		var n2 = n*n;
		var np = n;
		l = l+1/(12*np);
		np = np*n2;
		l = l+1/(360*np);
		np = np*n2;
		l = l+1/(1260*np);
		np = np*n2;
		l = l+1/(1680*np);
		np = np*n2;
		l = l+1/(1188*np);
		np = np*n2;
		l = l+691/(360360*np);
		np = np*n2;
		l = l+7/(1092*np);
		np = np*n2;
		l = l+3617/(122400*np);

		return Math.exp(l)/scal1;
	};
	
	var twopi = 6.2831853071795864769252842;	// 2*pi
	var EXPN1 = 0.36787944117144232159553;	// exp(-1)
	var OMEGA = 0.56714329040978387299997;	// W(1, 0)
	//from https://math.stackexchange.com/a/465183
	// The evaluation can become inaccurate very close to the branch point
	var f_lambertw = function(z, tol = 1e-10) {
		var w;
		var wn;

		if (!Number.isFinite(z)) { return z; }
		if (z === 0)
		{
			return z;
		}
		if (z === 1)
		{
			return OMEGA;
		}

		if (z < 10)
		{
			w = 0;
		}
		else
		{
			w = Math.log(z)-Math.log(Math.log(z));
		}

		for (var i = 0; i < 100; ++i)
		{
			wn = (z * Math.exp(-w) + w * w)/(w + 1);
			if (Math.abs(wn - w) < tol*Math.abs(wn))
			{
				return wn;
			}
			else
			{
				w = wn;
			}
		}

		throw Error("Iteration failed to converge: " + z);
		//return Number.NaN;
	};
	
	var Decimal =
	/** @class */
	function () {
		
		function Decimal(value) {
			
			this.sign = Number.NaN;
			this.layer = Number.NaN;
			this.mag = Number.NaN;

			if (value instanceof Decimal) {
				this.fromDecimal(value);
			} else if (typeof value === "number") {
				this.fromNumber(value);
			} else if (typeof value === "string") {
				this.fromString(value);
			} else {
				this.sign = 0;
				this.layer = 0;
				this.mag = 0;
			}
		}

		Object.defineProperty(Decimal.prototype, "m", {
			get: function get() {
				if (this.sign === 0)
				{
					return 0;
				}
				else if (this.layer === 0)
				{
					var exp = Math.floor(Math.log10(this.mag));
					//handle special case 5e-324
					var man;
					if (this.mag === 5e-324)
					{
						man = 5;
					}
					else
					{
						man = this.mag / powerOf10(exp);
					}
					return this.sign*man;
				}
				else if (this.layer === 1)
				{
					var residue = this.mag-Math.floor(this.mag);
					return this.sign*10**residue;
				}
				else
				{
					//mantissa stops being relevant past 1e9e15 / ee15.954
					return this.sign;
				}
			},
			set: function set(value) {
				if (this.layer <= 2)
				{
					this.fromMantissaExponent(value, this.e);
				}
				else
				{
					//don't even pretend mantissa is meaningful
					this.sign = Math.sign(value);
					if (this.sign === 0) { this.layer === 0; this.exponent === 0; }
				}
			},
			enumerable: true,
			configurable: true
		});
		Object.defineProperty(Decimal.prototype, "e", {
			get: function get() {
				if (this.sign === 0)
				{
					return 0;
				}
				else if (this.layer === 0)
				{
					return Math.floor(Math.log10(this.mag));
				}
				else if (this.layer === 1)
				{
					return Math.floor(this.mag);
				}
				else if (this.layer === 2)
				{
					return Math.floor(Math.sign(this.mag)*(10**Math.abs(this.mag)));
				}
				else
				{
					return this.mag*Number.POSITIVE_INFINITY;
				}
			},
			set: function set(value) {
				this.fromMantissaExponent(this.m, value);
			},
			enumerable: true,
			configurable: true
		});
		Object.defineProperty(Decimal.prototype, "s", {
			get: function get() {
				return this.sign;
			},
			set: function set(value) {
				if (value === 0) {
					this.sign = 0;
					this.layer = 0;
					this.mag = 0;
				}
				else
				{
					this.sign = value;
				}
			},
			enumerable: true,
			configurable: true
		});
		
		Object.defineProperty(Decimal.prototype, "mantissa", {
			get: function get() {
				return this.m;
			},
			set: function set(value) {
				this.m = value;
			},
			enumerable: true,
			configurable: true
		});

		Object.defineProperty(Decimal.prototype, "exponent", {
			get: function get() {
				return this.e;
			},
			set: function set(value) {
				this.e = value;
			},
			enumerable: true,
			configurable: true
		});

		Decimal.fromComponents = function (sign, layer, mag) {
			return new Decimal().fromComponents(sign, layer, mag);
		};

		Decimal.fromComponents_noNormalize = function (sign, layer, mag) {
			return new Decimal().fromComponents_noNormalize(sign, layer, mag);
		};
		
		Decimal.fromMantissaExponent = function (mantissa, exponent) {
			return new Decimal().fromMantissaExponent(mantissa, exponent);
		};

		Decimal.fromMantissaExponent_noNormalize = function (mantissa, exponent) {
			return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
		};
		
		Decimal.fromDecimal = function (value) {
			return new Decimal().fromDecimal(value);
		};

		Decimal.fromNumber = function (value) {
			return new Decimal().fromNumber(value);
		};

		Decimal.fromString = function (value) {
			return new Decimal().fromString(value);
		};

		Decimal.fromValue = function (value) {
			return new Decimal().fromValue(value);
		};

		Decimal.fromValue_noAlloc = function (value) {
			return value instanceof Decimal ? value : new Decimal(value);
		};
		
		Decimal.abs = function (value) {
			return D(value).abs();
		};

		Decimal.neg = function (value) {
			return D(value).neg();
		};

		Decimal.negate = function (value) {
			return D(value).neg();
		};

		Decimal.negated = function (value) {
			return D(value).neg();
		};

		Decimal.sign = function (value) {
			return D(value).sign();
		};

		Decimal.sgn = function (value) {
			return D(value).sign();
		};

		Decimal.round = function (value) {
			return D(value).round();
		};

		Decimal.floor = function (value) {
			return D(value).floor();
		};

		Decimal.ceil = function (value) {
			return D(value).ceil();
		};

		Decimal.trunc = function (value) {
			return D(value).trunc();
		};

		Decimal.add = function (value, other) {
			return D(value).add(other);
		};

		Decimal.plus = function (value, other) {
			return D(value).add(other);
		};

		Decimal.sub = function (value, other) {
			return D(value).sub(other);
		};

		Decimal.subtract = function (value, other) {
			return D(value).sub(other);
		};

		Decimal.minus = function (value, other) {
			return D(value).sub(other);
		};

		Decimal.mul = function (value, other) {
			return D(value).mul(other);
		};

		Decimal.multiply = function (value, other) {
			return D(value).mul(other);
		};

		Decimal.times = function (value, other) {
			return D(value).mul(other);
		};

		Decimal.div = function (value, other) {
			return D(value).div(other);
		};

		Decimal.divide = function (value, other) {
			return D(value).div(other);
		};

		Decimal.recip = function (value) {
			return D(value).recip();
		};

		Decimal.reciprocal = function (value) {
			return D(value).recip();
		};

		Decimal.reciprocate = function (value) {
			return D(value).reciprocate();
		};

		Decimal.cmp = function (value, other) {
			return D(value).cmp(other);
		};

		Decimal.cmpabs = function (value, other) {
			return D(value).cmpabs(other);
		};
	
		Decimal.compare = function (value, other) {
			return D(value).cmp(other);
		};

		Decimal.eq = function (value, other) {
			return D(value).eq(other);
		};

		Decimal.equals = function (value, other) {
			return D(value).eq(other);
		};

		Decimal.neq = function (value, other) {
			return D(value).neq(other);
		};

		Decimal.notEquals = function (value, other) {
			return D(value).notEquals(other);
		};

		Decimal.lt = function (value, other) {
			return D(value).lt(other);
		};

		Decimal.lte = function (value, other) {
			return D(value).lte(other);
		};

		Decimal.gt = function (value, other) {
			return D(value).gt(other);
		};

		Decimal.gte = function (value, other) {
			return D(value).gte(other);
		};

		Decimal.max = function (value, other) {
			return D(value).max(other);
		};
		
		Decimal.min = function (value, other) {
			return D(value).min(other);
		};

		Decimal.minabs = function (value, other) {
			return D(value).minabs(other);
		};
	
		Decimal.maxabs = function (value, other) {
			return D(value).maxabs(other);
		};
		
		Decimal.clamp = function(value, min, max) {
			return D(value).clamp(min, max);
		};
		
		Decimal.clampMin = function(value, min) {
			return D(value).clampMin(min);
		};
		
		Decimal.clampMax = function(value, max) {
			return D(value).clampMax(max);
		};

		Decimal.cmp_tolerance = function (value, other, tolerance) {
			return D(value).cmp_tolerance(other, tolerance);
		};

		Decimal.compare_tolerance = function (value, other, tolerance) {
			return D(value).cmp_tolerance(other, tolerance);
		};

		Decimal.eq_tolerance = function (value, other, tolerance) {
			return D(value).eq_tolerance(other, tolerance);
		};

		Decimal.equals_tolerance = function (value, other, tolerance) {
			return D(value).eq_tolerance(other, tolerance);
		};

		Decimal.neq_tolerance = function (value, other, tolerance) {
			return D(value).neq_tolerance(other, tolerance);
		};

		Decimal.notEquals_tolerance = function (value, other, tolerance) {
			return D(value).notEquals_tolerance(other, tolerance);
		};

		Decimal.lt_tolerance = function (value, other, tolerance) {
			return D(value).lt_tolerance(other, tolerance);
		};

		Decimal.lte_tolerance = function (value, other, tolerance) {
			return D(value).lte_tolerance(other, tolerance);
		};

		Decimal.gt_tolerance = function (value, other, tolerance) {
			return D(value).gt_tolerance(other, tolerance);
		};

		Decimal.gte_tolerance = function (value, other, tolerance) {
			return D(value).gte_tolerance(other, tolerance);
		};

		Decimal.pLog10 = function (value) {
			return D(value).pLog10();
		};
		
		Decimal.absLog10 = function (value) {
			return D(value).absLog10();
		};
		
		Decimal.log10 = function (value) {
			return D(value).log10();
		};

		Decimal.log = function (value, base) {
			return D(value).log(base);
		};

		Decimal.log2 = function (value) {
			return D(value).log2();
		};

		Decimal.ln = function (value) {
			return D(value).ln();
		};

		Decimal.logarithm = function (value, base) {
			return D(value).logarithm(base);
		};

		Decimal.pow = function (value, other) {
			return D(value).pow(other);
		};
		
		Decimal.pow10 = function (value) {
			return D(value).pow10();
		};
		
		Decimal.root = function (value, other) {
			return D(value).root(other);
		};
		
		Decimal.factorial = function (value, other) {
			return D(value).factorial();
		};
		
		Decimal.gamma = function (value, other) {
			return D(value).gamma();
		};
		
		Decimal.lngamma = function (value, other) {
			return D(value).lngamma();
		};

		Decimal.exp = function (value) {
			return D(value).exp();
		};

		Decimal.sqr = function (value) {
			return D(value).sqr();
		};

		Decimal.sqrt = function (value) {
			return D(value).pow(c.d0_5);
		};

		Decimal.cube = function (value) {
			return D(value).cube();
		};

		Decimal.cbrt = function (value) {
			return D(value).cbrt();
		};
		
		Decimal.tetrate = function (value, height = 2, payload = FC_NN(1, 0, 1)) {
			return D(value).tetrate(height, payload);
		};
		
		Decimal.iteratedexp = function (value, height = 2, payload = FC_NN(1, 0, 1)) {
			return D(value).iteratedexp(height, payload);
		};
		
		Decimal.iteratedlog = function (value, base = 10, times = 1) {
			return D(value).iteratedlog(base, times);
		};
		
		Decimal.layeradd10 = function (value, diff) {
			return D(value).layeradd10(diff);
		};
		
		Decimal.layeradd = function (value, diff, base = 10) {
			return D(value).layeradd(diff, base);
		};
		
		Decimal.slog = function (value, base = 10) {
			return D(value).slog(base);
		};
		
		Decimal.lambertw = function(value) {
			return D(value).lambertw();
		};
		
		Decimal.ssqrt = function(value) {
			return D(value).ssqrt();
		};
		
		Decimal.pentate = function (value, height = 2, payload = FC_NN(1, 0, 1)) {
			return D(value).pentate(height, payload);
		};
		
		/**
		 * If you're willing to spend 'resourcesAvailable' and want to buy something
		 * with exponentially increasing cost each purchase (start at priceStart,
		 * multiply by priceRatio, already own currentOwned), how much of it can you buy?
		 * Adapted from Trimps source code.
		 */


		Decimal.affordGeometricSeries = function (resourcesAvailable, priceStart, priceRatio, currentOwned) {
			return this.affordGeometricSeries_core(D(resourcesAvailable), D(priceStart), D(priceRatio), currentOwned);
		};
		/**
		 * How much resource would it cost to buy (numItems) items if you already have currentOwned,
		 * the initial price is priceStart and it multiplies by priceRatio each purchase?
		 */


		Decimal.sumGeometricSeries = function (numItems, priceStart, priceRatio, currentOwned) {
			return this.sumGeometricSeries_core(numItems, D(priceStart), D(priceRatio), currentOwned);
		};
		/**
		 * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
		 * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
		 * how much of it can you buy?
		 */


		Decimal.affordArithmeticSeries = function (resourcesAvailable, priceStart, priceAdd, currentOwned) {
			return this.affordArithmeticSeries_core(D(resourcesAvailable), D(priceStart), D(priceAdd), D(currentOwned));
		};
		/**
		 * How much resource would it cost to buy (numItems) items if you already have currentOwned,
		 * the initial price is priceStart and it adds priceAdd each purchase?
		 * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
		 */


		Decimal.sumArithmeticSeries = function (numItems, priceStart, priceAdd, currentOwned) {
			return this.sumArithmeticSeries_core(D(numItems), D(priceStart), D(priceAdd), D(currentOwned));
		};
		/**
		 * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
		 * the lowest efficiency score is the better one to purchase.
		 * From Frozen Cookies:
		 * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
		 */


		Decimal.efficiencyOfPurchase = function (cost, currentRpS, deltaRpS) {
			return this.efficiencyOfPurchase_core(D(cost), D(currentRpS), D(deltaRpS));
		};

		Decimal.randomDecimalForTesting = function (maxLayers) {
			// NOTE: This doesn't follow any kind of sane random distribution, so use this for testing purposes only.
			//5% of the time, return 0
			if (Math.random() * 20 < 1) {
				return FC_NN(0, 0, 0);
			}
			
			var randomsign = Math.random() > 0.5 ? 1 : -1;
			
			//5% of the time, return 1 or -1
			if (Math.random() * 20 < 1) {
				return FC_NN(randomsign, 0, 1);
			}
			
			//pick a random layer
			var layer = Math.floor(Math.random()*(maxLayers+1));

			var randomexp = layer === 0 ? Math.random()*616-308 : Math.random()*16;
			//10% of the time, make it a simple power of 10
			if (Math.random() > 0.9) { randomexp = Math.trunc(randomexp); }
			var randommag = 10**randomexp;
			//10% of the time, trunc mag
			if (Math.random() > 0.9) { randommag = Math.trunc(randommag); }
			return FC(randomsign, layer, randommag);
		};

		Decimal.affordGeometricSeries_core = function (resourcesAvailable, priceStart, priceRatio, currentOwned) {
			var actualStart = priceStart.mul(priceRatio.pow(currentOwned));
			return Decimal.floor(resourcesAvailable.div(actualStart).mul(priceRatio.sub(1)).add(1).log10().div(priceRatio.log10()));
		};

		Decimal.sumGeometricSeries_core = function (numItems, priceStart, priceRatio, currentOwned) {
			return priceStart.mul(priceRatio.pow(currentOwned)).mul(Decimal.sub(1, priceRatio.pow(numItems))).div(Decimal.sub(1, priceRatio));
		};

		Decimal.affordArithmeticSeries_core = function (resourcesAvailable, priceStart, priceAdd, currentOwned) {
			// n = (-(a-d/2) + sqrt((a-d/2)^2+2dS))/d
			// where a is actualStart, d is priceAdd and S is resourcesAvailable
			// then floor it and you're done!
			var actualStart = priceStart.add(currentOwned.mul(priceAdd));
			var b = actualStart.sub(priceAdd.div(2));
			var b2 = b.pow(2);
			return b.neg().add(b2.add(priceAdd.mul(resourcesAvailable).mul(2)).pow(c.d0_5)).div(priceAdd).floor();
		};

		Decimal.sumArithmeticSeries_core = function (numItems, priceStart, priceAdd, currentOwned) {
			var actualStart = priceStart.add(currentOwned.mul(priceAdd)); // (n/2)*(2*a+(n-1)*d)

			return numItems.div(2).mul(actualStart.mul(2).plus(numItems.sub(1).mul(priceAdd)));
		};

		Decimal.efficiencyOfPurchase_core = function (cost, currentRpS, deltaRpS) {
			return cost.div(currentRpS).add(cost.div(deltaRpS));
		};

		// ALEMANINC FUNCTIONS START HERE
		Decimal.FC_NN = function (sign, layer, mag) {
			return Decimal.fromComponents_noNormalize(sign,layer,mag)
		};

		Decimal.linearSoftcap = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return start.mul(FC_NN(1,0,1).add(power.add(1).mul(value.div(start).sub(1))).root(power.add(1))).layerplus(layer);
		};

		Decimal.semilogSoftcap = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return Decimal.pow(start,value.mul(power.add(1)).sub(start.mul(power)).log(start).root(power.add(1))).layerplus(layer);
		};

		Decimal.logarithmicSoftcap = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			if (value.div(start).ln().mul(power).lt(c.em10)) {return value.layerplus(layer)}
			return value.div(start).ln().mul(power).add(1).root(power).mul(start).layerplus(layer);
		};

		Decimal.superlogSoftcap = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return value.div(start).pow(power).quad_slog(constant.e).add(constant.d1).root(power).mul(start).layerplus(layer);
		};

		Decimal.convergentSoftcap = function (value,start,limit,layer=0) {
			if (Decimal.eq(start,limit)) return N(start);
			if (Decimal.sub(value,start).sign == Decimal.sub(start,limit).sign) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			limit=limit.layerplus(-layer);
			return limit.sub(limit.sub(start).div(FC_NN(1,0,1).add(value.sub(start).div(limit.sub(start))))).layerplus(layer);
		};

		Decimal.linearScaling = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return start.div(power.add(constant.d1)).mul(power.add((value.div(start)).pow(power.add(constant.d1)))).layerplus(layer);
		};

		Decimal.semiexpScaling = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return start.pow(value.log(start).pow(power.add(constant.d1))).div(power.add(constant.d1)).add(start.mul(FC_NN(1,0,1).sub(power.add(constant.d1).pow(-1)))).layerplus(layer);
		};

		Decimal.exponentialScaling = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return value.div(start).pow(power).sub(1).div(power).exp().mul(start).layerplus(layer);
		};

		Decimal.superexpScaling = function (value,start,power,layer=0) {
			if (Decimal.lt(value,start)) return value;
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			return constant.e.quad_tetr(value.div(start).pow(power).sub(1)).root(power).mul(start).layerplus(layer);
		};

		Decimal.divergentScaling = function (value,start,limit,layer=0) {
			if (Decimal.sub(value,start).sign == Decimal.sub(start,limit).sign) return N(value);
			value=value.layerplus(-layer);
			start=start.layerplus(-layer);
			limit=limit.layerplus(-layer);
			let output=limit.sub(start).mul(limit.sub(start).div(limit.sub(value)).sub(1)).add(start).layerplus(layer);
			if (output==FC_NN(1,0,1).div(0)) return constant.maxvalue;
			return output;
		};
		
		Decimal.safediv = function (dividend, divisor) {
			if (divisor == Infinity) return Decimal.fromComponents(0,0,0)
			return new Decimal(dividend).div(divisor)
		}

		Decimal.decibel = function (x) {
			x=N(x)
			if (x.mod(1).neq(0)) throw "Could not calculate Decimal.decibel("+x+"); input must be an integer"
			if (x.layer!==0) return Decimal.pow(10,x.div(10))
			return x.div(10).floor().pow10().mul([1,1.25,1.6,2,2.5,3.2,4,5,6.4,8][x.mod(10).toNumber()])
		}

		Decimal.valid = function (x) {
			return !Object.values(new Decimal(x)).includes(NaN)
		}
		
		Decimal.prototype.normalize = function () {
			/*
			PSEUDOCODE:
			Whenever we are partially 0 (sign is 0 or mag and layer is 0), make it fully 0.
			Whenever we are at or hit layer 0, extract sign from negative mag.
			If layer === 0 and mag < FIRST_NEG_LAYER (1/9e15), shift to 'first negative layer' (add layer, log10 mag).
			While abs(mag) > EXP_LIMIT (9e15), layer += 1, mag = maglog10(mag).
			While abs(mag) < LAYER_DOWN (15.954) and layer > 0, layer -= 1, mag = pow(10, mag).
			
			When we're done, all of the following should be true OR one of the numbers is not IsFinite OR layer is not IsInteger (error state):
			Any 0 is totally zero (0, 0, 0).
			Anything layer 0 has mag 0 OR mag > 1/9e15 and < 9e15.
			Anything layer 1 or higher has abs(mag) >= 15.954 and < 9e15.
			We will assume in calculations that all Decimals are either erroneous or satisfy these criteria. (Otherwise: Garbage in, garbage out.)
			*/
			if (this.sign === 0 || (this.mag === 0 && this.layer === 0))
			{
				this.sign = 0;
				this.mag = 0;
				this.layer = 0;
				return this;
			}
			
			if (this.layer === 0 && this.mag < 0)
			{
				//extract sign from negative mag at layer 0
				this.mag = -this.mag;
				this.sign = -this.sign;
			}
			
			//Handle shifting from layer 0 to negative layers.
			if (this.layer === 0 && this.mag < FIRST_NEG_LAYER)
			{
				this.layer += 1;
				this.mag = Math.log10(this.mag);
				return this;
			}
			
			var absmag = Math.abs(this.mag);
			var signmag = Math.sign(this.mag);
			
			if (absmag >= EXP_LIMIT)
			{
				this.layer += 1;
				this.mag = signmag*Math.log10(absmag);
				return this;
			}
			else
			{
				while (absmag < LAYER_DOWN && this.layer > 0)
				{
					this.layer -= 1;
					if (this.layer === 0)
					{
						this.mag = 10**this.mag;
					}
					else
					{
						this.mag = signmag*10**absmag;
						absmag = Math.abs(this.mag);
						signmag = Math.sign(this.mag);
					}
				}
				if (this.layer === 0)
				{
					if (this.mag < 0)
					{
						//extract sign from negative mag at layer 0
						this.mag = -this.mag;
						this.sign = -this.sign;
					}
					else if (this.mag === 0)
					{
						//excessive rounding can give us all zeroes
						this.sign = 0;
					}
				}
			}

			return this;
		};

		Decimal.prototype.fromComponents = function (sign, layer, mag) {
			this.sign = sign;
			this.layer = layer;
			this.mag = mag;

			this.normalize();
			return this;
		};

		Decimal.prototype.clone = function() {
			return this;
		};

		Decimal.prototype.fromComponents_noNormalize = function (sign, layer, mag) {
			this.sign = sign;
			this.layer = layer;
			this.mag = mag;
			return this;
		};
		
		Decimal.prototype.fromMantissaExponent = function (mantissa, exponent) {
			this.layer = 1;
			this.sign = Math.sign(mantissa);
			mantissa = Math.abs(mantissa);
			this.mag = exponent + Math.log10(mantissa);

			this.normalize();
			return this;
		};


		Decimal.prototype.fromMantissaExponent_noNormalize = function (mantissa, exponent) {
			//The idea of 'normalizing' a break_infinity.js style Decimal doesn't really apply. So just do the same thing.
			this.fromMantissaExponent(mantissa, exponent);
			return this;
		};

		Decimal.prototype.fromDecimal = function (value) {
			this.sign = value.sign;
			this.layer = value.layer;
			this.mag = value.mag;
			return this;
		};

		Decimal.prototype.fromNumber = function (value) {
			this.mag = Math.abs(value);
			this.sign = Math.sign(value);
			this.layer = 0;
			this.normalize();
			return this;
		};

		var IGNORE_COMMAS = true;
		var COMMAS_ARE_DECIMAL_POINTS = false;
		
		Decimal.prototype.fromString = function (value) {
			if (IGNORE_COMMAS) { value = value.replace(",", ""); }
			else if (COMMAS_ARE_DECIMAL_POINTS) { value = value.replace(",", "."); }
		
			//Handle x^^^y format.
			var pentationparts = value.split("^^^");
			if (pentationparts.length === 2)
			{
				var base = parseFloat(pentationparts[0]);
				var height = parseFloat(pentationparts[1]);
				var payload = 1;
				var heightparts = pentationparts[1].split(";");
				if (heightparts.length === 2)
				{
					var payload = parseFloat(heightparts[1]);
					if (!isFinite(payload)) { payload = 1; }
				}
				if (isFinite(base) && isFinite(height))
				{
					var result = Decimal.pentate(base, height, payload);
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
			}
		
			//Handle x^^y format.
			var tetrationparts = value.split("^^");
			if (tetrationparts.length === 2)
			{
				var base = parseFloat(tetrationparts[0]);
				var height = parseFloat(tetrationparts[1]);
				var heightparts = tetrationparts[1].split(";");
				if (heightparts.length === 2)
				{
					var payload = parseFloat(heightparts[1]);
					if (!isFinite(payload)) { payload = 1; }
				}
				if (isFinite(base) && isFinite(height))
				{
					var result = Decimal.tetrate(base, height, payload);
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
			}
			
			//Handle x^y format.
			var powparts = value.split("^");
			if (powparts.length === 2)
			{
				var base = parseFloat(powparts[0]);
				var exponent = parseFloat(powparts[1]);
				if (isFinite(base) && isFinite(exponent))
				{
					var result = Decimal.pow(base, exponent);
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
			}
			
			//Handle various cases involving it being a Big Number.
			value = value.trim().toLowerCase();
			
			//handle X PT Y format.
			var ptparts = value.split("pt");
			if (ptparts.length === 2)
			{
				base = 10;
				height = parseFloat(ptparts[0]);
				ptparts[1] = ptparts[1].replace("(", "");
				ptparts[1] = ptparts[1].replace(")", "");
				var payload = parseFloat(ptparts[1]);
				if (!isFinite(payload)) { payload = 1; }
				if (isFinite(base) && isFinite(height))
				{
					var result = Decimal.tetrate(base, height, payload);
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
			}
			
			//handle XpY format (it's the same thing just with p).
			var ptparts = value.split("p");
			if (ptparts.length === 2)
			{
				base = 10;
				height = parseFloat(ptparts[0]);
				ptparts[1] = ptparts[1].replace("(", "");
				ptparts[1] = ptparts[1].replace(")", "");
				var payload = parseFloat(ptparts[1]);
				if (!isFinite(payload)) { payload = 1; }
				if (isFinite(base) && isFinite(height))
				{
					var result = Decimal.tetrate(base, height, payload);
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
			}

			var parts = value.split("e");
			var ecount = parts.length-1;
		
			//Handle numbers that are exactly floats (0 or 1 es).
			if (ecount === 0)
			{
				var numberAttempt = parseFloat(value);
				if (isFinite(numberAttempt))
				{
					return this.fromNumber(numberAttempt);
				}
			}
			else if (ecount === 1)
			{
				//Very small numbers ("2e-3000" and so on) may look like valid floats but round to 0.
				var numberAttempt = parseFloat(value);
				if (isFinite(numberAttempt) && numberAttempt !== 0)
				{
					return this.fromNumber(numberAttempt);
				}
			}
			
			//Handle new (e^N)X format.
			var newparts = value.split("e^");
			if (newparts.length === 2)
			{
				this.sign = 1;
				if (newparts[0].charAt(0) == "-")
				{
					this.sign = -1;
				}
				var layerstring = "";
				for (var i = 0; i < newparts[1].length; ++i)
				{
					var chrcode = newparts[1].charCodeAt(i);
					if ((chrcode >= 43 && chrcode <= 57) || chrcode === 101) //is "0" to "9" or "+" or "-" or "." or "e" (or "," or "/")
					{
						layerstring += newparts[1].charAt(i);
					}
					else //we found the end of the layer count
					{
						this.layer = parseFloat(layerstring);
						this.mag = parseFloat(newparts[1].substring(i+1));
						this.normalize();
						return this;
					}
				}
			}
			
			if (ecount < 1) { this.sign = 0; this.layer = 0; this.mag = 0; return this; }
			var mantissa = parseFloat(parts[0]);
			if (mantissa === 0) { this.sign = 0; this.layer = 0; this.mag = 0; return this; }
			var exponent = parseFloat(parts[parts.length-1]);
			//handle numbers like AeBeC and AeeeeBeC
			if (ecount >= 2)
			{
				var me = parseFloat(parts[parts.length-2]);
				if (isFinite(me))
				{
					exponent *= Math.sign(me);
					exponent += f_maglog10(me);
				}
			}
			
			//Handle numbers written like eee... (N es) X
			if (!isFinite(mantissa))
			{
				this.sign = (parts[0] === "-") ? -1 : 1;
				this.layer = ecount;
				this.mag = exponent;
			}
			//Handle numbers written like XeY
			else if (ecount === 1)
			{
				this.sign = Math.sign(mantissa);
				this.layer = 1;
				//Example: 2e10 is equal to 10^log10(2e10) which is equal to 10^(10+log10(2))
				this.mag = exponent + Math.log10(Math.abs(mantissa));
			}
			//Handle numbers written like Xeee... (N es) Y
			else
			{
				this.sign = Math.sign(mantissa);
				this.layer = ecount;
				if (ecount === 2)
				{
					var result = Decimal.mul(FC(1, 2, exponent), D(mantissa));
					this.sign = result.sign;
					this.layer = result.layer;
					this.mag = result.mag;
					return this;
				}
				else
				{
					//at eee and above, mantissa is too small to be recognizable!
					this.mag = exponent;
				}
			}
			
			this.normalize();
			return this;
		};

		Decimal.prototype.fromValue = function (value) {
			if (value instanceof Decimal) {
				return this.fromDecimal(value);
			}

			if (typeof value === "number") {
				return this.fromNumber(value);
			}

			if (typeof value === "string") {
				return this.fromString(value);
			}

			this.sign = 0;
			this.layer = 0;
			this.mag = 0;
			return this;
		};

		Decimal.prototype.toNumber = function () {
			if (!Number.isFinite(this.layer)) { return Number.NaN; }
			if (this.layer === 0)
			{
				return this.sign*this.mag;
			}
			else if (this.layer === 1)
			{
				return this.sign*10**this.mag;
			}
			else //overflow for any normalized Decimal
			{
				return this.mag > 0 ? (this.sign > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : 0;
			}
		};
		
		Decimal.prototype.mantissaWithDecimalPlaces = function (places) {
			// https://stackoverflow.com/a/37425022
			if (isNaN(this.m)) {
				return Number.NaN;
			}

			if (this.m === 0) {
				return 0;
			}

			return decimalPlaces(this.m, places);
		};
		
		Decimal.prototype.magnitudeWithDecimalPlaces = function (places) {
			// https://stackoverflow.com/a/37425022
			if (isNaN(this.mag)) {
				return Number.NaN;
			}

			if (this.mag === 0) {
				return 0;
			}

			return decimalPlaces(this.mag, places);
		};
		
		Decimal.prototype.toString = function () {
			if (this.layer === 0)
			{
				if ((this.mag < 1e21 && this.mag > 1e-7) || this.mag === 0)
				{
					return (this.sign*this.mag).toString();
				}
				return this.m + "e" + this.e;
			}
			else if (this.layer === 1)
			{
				return this.m + "e" + this.e;
			}
			else
			{
				//layer 2+
				if (this.layer <= MAX_ES_IN_A_ROW)
				{
					return (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + this.mag;
				}
				else
				{
					return (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + this.mag;
				}
			}
		};
		
		Decimal.prototype.toExponential = function (places) {
			if (this.layer === 0)
			{
				return (this.sign*this.mag).toExponential(places);
			}
			return this.toStringWithDecimalPlaces(places);
		};
		
		Decimal.prototype.toFixed = function (places) {
			if (this.layer === 0)
			{
				return (this.sign*this.mag).toFixed(places);
			}
			return this.toStringWithDecimalPlaces(places);
		};
		
		Decimal.prototype.toPrecision = function (places) {
			if (this.e <= -7) {
				return this.toExponential(places - 1);
			}

			if (places > this.e) {
				return this.toFixed(places - this.exponent - 1);
			}

			return this.toExponential(places - 1);
		};
		
		Decimal.prototype.valueOf = function () {
			return this.toString();
		};

		Decimal.prototype.toJSON = function () {
			return this.toString();
		};

		Decimal.prototype.toStringWithDecimalPlaces = function (places) {
			if (this.layer === 0)
			{
				if ((this.mag < 1e21 && this.mag > 1e-7) || this.mag === 0)
				{
					return (this.sign*this.mag).toFixed(places);
				}
				return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
			}
			else if (this.layer === 1)
			{
				return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
			}
			else
			{
				//layer 2+
				if (this.layer <= MAX_ES_IN_A_ROW)
				{
					return (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + decimalPlaces(this.mag, places);
				}
				else
				{
					return (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + decimalPlaces(this.mag, places);
				}
			}
		};
		
		Decimal.prototype.abs = function () {
			return FC_NN(this.sign === 0 ? 0 : 1, this.layer, this.mag);
		};

		Decimal.prototype.neg = function () {
			return FC_NN(-this.sign, this.layer, this.mag);
		};

		Decimal.prototype.negate = function () {
			return this.neg();
		};

		Decimal.prototype.negated = function () {
			return this.neg();
		};

		Decimal.prototype.sign = function () {
			return this.sign;
		};

		Decimal.prototype.sgn = function () {
			return this.sign;
		};
		
		Decimal.prototype.round = function () {
			if (this.mag < 0)
			{
				return Decimal.dZero;
			}
			if (this.layer === 0)
			{
				return FC(this.sign, 0, Math.round(this.mag));
			}
			return this;
		};

		Decimal.prototype.floor = function () {
			if (this.sign === -1) return this.mul(-1).ceil().mul(-1);
			if (this.mag < 0){return (this.sign === 1)?Decimal.dZero:Decimal.dNegOne}
			if (this.layer === 0)
			{
				return FC(this.sign, 0, Math.floor(this.mag));
			}
			return this;
		};

		Decimal.prototype.ceil = function () {
			if (this.sign === 0) return Decimal.dZero
			if (this.mag < 0){return (this.sign === 1)?Decimal.dOne:Decimal.dZero;}
			if (this.layer === 0){
				if (this.sign===-1) return FC(-1, 0, -Math.ceil(-this.mag))
				return FC(1, 0, Math.ceil(this.mag));
			}
			return this;
		};

		Decimal.prototype.trunc = function () {
			if (this.mag < 0)
			{
				return Decimal.dZero;
			}
			if (this.layer === 0)
			{
				return FC(this.sign, 0, Math.trunc(this.mag));
			}
			return this;
		};

		Decimal.prototype.add = function (value) {
			var decimal = D(value);
			
			//inf/nan check
			if (!Number.isFinite(this.layer)) { return this; }
			if (!Number.isFinite(decimal.layer)) { return decimal; }
			
			//Special case - if one of the numbers is 0, return the other number.
			if (this.sign === 0) { return decimal; }
			if (decimal.sign === 0) { return this; }
			
			//Special case - Adding a number to its negation produces 0, no matter how large.
			if (this.sign === -(decimal.sign) && this.layer === decimal.layer && this.mag === decimal.mag) { return FC_NN(0, 0, 0); }
			
			var a;
			var b;
			
			//Special case: If one of the numbers is layer 2 or higher, just take the bigger number.
			if ((this.layer >= 2 || decimal.layer >= 2)) { return this.maxabs(decimal); }
			
			if (Decimal.cmpabs(this, decimal) > 0)
			{
				a = this;
				b = decimal;
			}
			else
			{
				a = decimal;
				b = this;
			}
			
			if (a.layer === 0 && b.layer === 0) { return D(a.sign*a.mag + b.sign*b.mag); }
			
			var layera = a.layer*Math.sign(a.mag);
			var layerb = b.layer*Math.sign(b.mag);
			
			//If one of the numbers is 2+ layers higher than the other, just take the bigger number.
			if (layera - layerb >= 2) { return a; }
			
			if (layera === 0 && layerb === -1)
			{
				if (Math.abs(b.mag-Math.log10(a.mag)) > MAX_SIGNIFICANT_DIGITS)
				{
					return a;
				}
				else
				{
					var magdiff = 10**(Math.log10(a.mag)-b.mag);
					var mantissa = (b.sign)+(a.sign*magdiff);
					return FC(Math.sign(mantissa), 1, b.mag+Math.log10(Math.abs(mantissa)));
				}
			}
			
			if (layera === 1 && layerb === 0)
			{
				if (Math.abs(a.mag-Math.log10(b.mag)) > MAX_SIGNIFICANT_DIGITS)
				{
					return a;
				}
				else
				{
					var magdiff = 10**(a.mag-Math.log10(b.mag));
					var mantissa = (b.sign)+(a.sign*magdiff);
					return FC(Math.sign(mantissa), 1, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
				}
			}
			
			if (Math.abs(a.mag-b.mag) > MAX_SIGNIFICANT_DIGITS)
			{
				return a;
			}
			else
			{
				var magdiff = 10**(a.mag-b.mag);
				var mantissa = (b.sign)+(a.sign*magdiff);
				return FC(Math.sign(mantissa), 1, b.mag+Math.log10(Math.abs(mantissa)));
			}
			
			throw Error("Bad arguments to add: " + this + ", " + value);
		};

		Decimal.prototype.plus = function (value) {
			return this.add(value);
		};

		Decimal.prototype.sub = function (value) {
			return this.add(D(value).neg());
		};

		Decimal.prototype.subtract = function (value) {
			return this.sub(value);
		};

		Decimal.prototype.minus = function (value) {
			return this.sub(value);
		};

		Decimal.prototype.mul = function (value) {
			var decimal = D(value);
			
			//inf/nan check
			if (!Number.isFinite(this.layer)) { return this; }
			if (!Number.isFinite(decimal.layer)) { return decimal; }
			
			//Special case - if one of the numbers is 0, return 0.
			if (this.sign === 0 || decimal.sign === 0) { return FC_NN(0, 0, 0); }
			
			//Special case - Multiplying a number by its own reciprocal yields +/- 1, no matter how large.
			if (this.layer === decimal.layer && this.mag === -decimal.mag) { return FC_NN(this.sign*decimal.sign, 0, 1); }
						
			var a;
			var b;
			
			//Which number is bigger in terms of its multiplicative distance from 1?
			if ((this.layer > decimal.layer) || (this.layer == decimal.layer && Math.abs(this.mag) > Math.abs(decimal.mag)))
			{
				a = this;
				b = decimal;
			}
			else
			{
				a = decimal;
				b = this;
			}
			
			if (a.layer === 0 && b.layer === 0) { return D(a.sign*b.sign*a.mag*b.mag); }
			
			//Special case: If one of the numbers is layer 3 or higher or one of the numbers is 2+ layers bigger than the other, just take the bigger number.
			if (a.layer >= 3 || (a.layer - b.layer >= 2)) { return FC(a.sign*b.sign, a.layer, a.mag); }

			if (a.layer === 1 && b.layer === 0)
			{ 
				return FC(a.sign*b.sign, 1, a.mag+Math.log10(b.mag));
			}
			
			if (a.layer === 1 && b.layer === 1)
			{
				return FC(a.sign*b.sign, 1, a.mag+b.mag);
			}
			
			if (a.layer === 2 && b.layer === 1)
			{
				var newmag = FC(Math.sign(a.mag), a.layer-1, Math.abs(a.mag)).add(FC(Math.sign(b.mag), b.layer-1, Math.abs(b.mag)));
				return FC(a.sign*b.sign, newmag.layer+1, newmag.sign*newmag.mag);
			}
			
			if (a.layer === 2 && b.layer === 2)
			{
				var newmag = FC(Math.sign(a.mag), a.layer-1, Math.abs(a.mag)).add(FC(Math.sign(b.mag), b.layer-1, Math.abs(b.mag)));
				return FC(a.sign*b.sign, newmag.layer+1, newmag.sign*newmag.mag);
			}
			
			throw Error("Bad arguments to mul: " + this + ", " + value);
		};

		Decimal.prototype.multiply = function (value) {
			return this.mul(value);
		};

		Decimal.prototype.times = function (value) {
			return this.mul(value);
		};

		Decimal.prototype.div = function (value) {
			var decimal = D(value);
			return this.mul(decimal.recip());
		};

		Decimal.prototype.divide = function (value) {
			return this.div(value);
		};

		Decimal.prototype.divideBy = function (value) {
			return this.div(value);
		};

		Decimal.prototype.dividedBy = function (value) {
			return this.div(value);
		};

		Decimal.prototype.recip = function () {
			if (this.mag === 0)
			{
				return Decimal.dNaN;
			}
			else if (this.layer === 0)
			{
				return FC(this.sign, 0, 1/this.mag);
			}
			else
			{
				return FC(this.sign, this.layer, -this.mag);
			}
		};

		Decimal.prototype.reciprocal = function () {
			return this.recip();
		};

		Decimal.prototype.reciprocate = function () {
			return this.recip();
		};
		
		/**
		 * -1 for less than value, 0 for equals value, 1 for greater than value
		 */
		Decimal.prototype.cmp = function (value) {
			var decimal = D(value);
			if (this.sign > decimal.sign) { return 1; }
			if (this.sign < decimal.sign) { return -1; }
			return this.sign*this.cmpabs(value);
		};
	
		Decimal.prototype.cmpabs = function (value) {
			var decimal = D(value);
			var layera = this.mag > 0 ? this.layer : -this.layer;
			var layerb = decimal.mag > 0 ? decimal.layer : -decimal.layer;
			if (layera > layerb) { return 1; }
			if (layera < layerb) { return -1; }
			if (this.mag > decimal.mag) { return 1; }
			if (this.mag < decimal.mag) { return -1; }
			return 0;
		};

		Decimal.prototype.compare = function (value) {
			return this.cmp(value);
		};

		Decimal.prototype.eq = function (value) {
			var decimal = D(value);
			return this.sign === decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag;
		};

		Decimal.prototype.equals = function (value) {
			return this.eq(value);
		};

		Decimal.prototype.neq = function (value) {
			return !this.eq(value);
		};

		Decimal.prototype.notEquals = function (value) {
			return this.neq(value);
		};

		Decimal.prototype.lt = function (value) {
			var decimal = D(value);
			return this.cmp(value) === -1;
		};

		Decimal.prototype.lte = function (value) {
			return !this.gt(value);
		};

		Decimal.prototype.gt = function (value) {
			var decimal = D(value);
			return this.cmp(value) === 1;
		};

		Decimal.prototype.gte = function (value) {
			return !this.lt(value);
		};

		Decimal.prototype.max = function (value) {
			var decimal = D(value);
			return this.lt(decimal) ? decimal : this;
		};

		Decimal.prototype.min = function (value) {
			var decimal = D(value);
			return this.gt(decimal) ? decimal : this;
		};
	
		Decimal.prototype.maxabs = function (value) {
			var decimal = D(value);
			return this.cmpabs(decimal) < 0 ? decimal : this;
		};

		Decimal.prototype.minabs = function (value) {
			var decimal = D(value);
			return this.cmpabs(decimal) > 0 ? decimal : this;
		};
		
		Decimal.prototype.clamp = function(min, max) {
			return this.max(min).min(max);
		};
		
		Decimal.prototype.clampMin = function(min) {
			return this.max(min);
		};
		
		Decimal.prototype.clampMax = function(max) {
			return this.min(max);
		};

		Decimal.prototype.cmp_tolerance = function (value, tolerance) {
			var decimal = D(value);
			return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
		};

		Decimal.prototype.compare_tolerance = function (value, tolerance) {
			return this.cmp_tolerance(value, tolerance);
		};
		
		/**
		 * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
		 * For example, if you put in 1e-9, then any number closer to the
		 * larger number than (larger number)*1e-9 will be considered equal.
		 */
		Decimal.prototype.eq_tolerance = function (value, tolerance) {
			var decimal = D(value); // https://stackoverflow.com/a/33024979
			if (tolerance == null) { tolerance = 1e-7; }
			//Numbers that are too far away are never close.
			if (this.sign !== decimal.sign) { return false; }
			if (Math.abs(this.layer - decimal.layer) > 1) { return false; }
			// return abs(a-b) <= tolerance * max(abs(a), abs(b))
			var magA = this.mag;
			var magB = decimal.mag;
			if (this.layer > decimal.layer) { magB = f_maglog10(magB); }
			if (this.layer < decimal.layer) { magA = f_maglog10(magA); }
			return Math.abs(magA-magB) <= tolerance*Math.max(Math.abs(magA), Math.abs(magB));
		};

		Decimal.prototype.equals_tolerance = function (value, tolerance) {
			return this.eq_tolerance(value, tolerance);
		};

		Decimal.prototype.neq_tolerance = function (value, tolerance) {
			return !this.eq_tolerance(value, tolerance);
		};

		Decimal.prototype.notEquals_tolerance = function (value, tolerance) {
			return this.neq_tolerance(value, tolerance);
		};

		Decimal.prototype.lt_tolerance = function (value, tolerance) {
			var decimal = D(value);
			return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
		};

		Decimal.prototype.lte_tolerance = function (value, tolerance) {
			var decimal = D(value);
			return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
		};

		Decimal.prototype.gt_tolerance = function (value, tolerance) {
			var decimal = D(value);
			return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
		};

		Decimal.prototype.gte_tolerance = function (value, tolerance) {
			var decimal = D(value);
			return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
		};
		
		Decimal.prototype.pLog10 = function() {
			if (this.lt(Decimal.dZero)) { return Decimal.dZero; }
			return this.log10();
		};

		Decimal.prototype.absLog10 = function () {
			if (this.sign === 0)
			{
				return Decimal.dNaN;
			}
			else if (this.layer > 0)
			{
				return FC(Math.sign(this.mag), this.layer-1, Math.abs(this.mag));
			}
			else
			{
				return FC(1, 0, Math.log10(this.mag));
			}
		};
		
		Decimal.prototype.log10 = function () {
			if (this.sign <= 0)
			{
				return Decimal.dNaN;
			}
			else if (this.layer > 0)
			{
				return FC(Math.sign(this.mag), this.layer-1, Math.abs(this.mag));
			}
			else
			{
				return FC(this.sign, 0, Math.log10(this.mag));
			}
		};

		Decimal.prototype.log = function (base) {
			base = D(base);
			if (this.sign <= 0)
			{
				return Decimal.dNaN;
			}
			if (base.sign <= 0)
			{
				return Decimal.dNaN;
			}
			if (base.sign === 1 && base.layer === 0 && base.mag === 1)
			{
				return Decimal.dNaN;
			}
			else if (this.layer === 0 && base.layer === 0)
			{
				return FC(this.sign, 0, Math.log(this.mag)/Math.log(base.mag));
			}
			
			return Decimal.div(this.log10(), base.log10());
		};

		Decimal.prototype.log2 = function () {
			if (this.sign <= 0)
			{
				return Decimal.dNaN;
			}
			else if (this.layer === 0)
			{
				return FC(this.sign, 0, Math.log2(this.mag));
			}
			else if (this.layer === 1)
			{
				return FC(Math.sign(this.mag), 0, Math.abs(this.mag)*3.321928094887362); //log2(10)
			}
			else if (this.layer === 2)
			{
				return FC(Math.sign(this.mag), 1, Math.abs(this.mag)+0.5213902276543247); //-log10(log10(2))
			}
			else
			{
				return FC(Math.sign(this.mag), this.layer-1, Math.abs(this.mag));
			}
		};

		Decimal.prototype.ln = function () {
			if (this.sign <= 0)
			{
				return Decimal.dNaN;
			}
			else if (this.layer === 0)
			{
				return FC(this.sign, 0, Math.log(this.mag));
			}
			else if (this.layer === 1)
			{
				return FC(Math.sign(this.mag), 0, Math.abs(this.mag)*2.302585092994046); //ln(10)
			}
			else if (this.layer === 2)
			{
				return FC(Math.sign(this.mag), 1, Math.abs(this.mag)+0.36221568869946325); //log10(log10(e))
			}
			else
			{
				return FC(Math.sign(this.mag), this.layer-1, Math.abs(this.mag));
			}
		};

		Decimal.prototype.logarithm = function (base) {
			return this.log(base);
		};

		Decimal.prototype.pow = function (value) {
			var decimal = D(value);
			var a = this;
			var b = decimal;

			//special case: if a is 0, then return 0 (UNLESS b is 0, then return 1)
			if (a.sign === 0) { return b.eq(0) ? FC_NN(1, 0, 1) : a; }
			//special case: if a is 1, then return 1
			if (a.sign === 1 && a.layer === 0 && a.mag === 1) { return a; }
			//special case: if b is 0, then return 1
			if (b.sign === 0) { return FC_NN(1, 0, 1); }
			//special case: if b is 1, then return a
			if (b.sign === 1 && b.layer === 0 && b.mag === 1) { return a; }
			
			var result = (a.absLog10().mul(b)).pow10();

			if (this.sign === -1 && Math.abs(b.toNumber() % 2) === 1) {
				return result.neg();
			}

			return result;
		};
		
		Decimal.prototype.pow10 = function() {
			/*
			There are four cases we need to consider:
			1) positive sign, positive mag (e15, ee15): +1 layer (e.g. 10^15 becomes e15, 10^e15 becomes ee15)
			2) negative sign, positive mag (-e15, -ee15): +1 layer but sign and mag sign are flipped (e.g. 10^-15 becomes e-15, 10^-e15 becomes ee-15)
			3) positive sign, negative mag (e-15, ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
			4) negative sign, negative mag (-e-15, -ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
			*/
			
			if (!Number.isFinite(this.layer) || !Number.isFinite(this.mag)) { return Decimal.dNaN; }
			
			var a = this;
			
			//handle layer 0 case - if no precision is lost just use Math.pow, else promote one layer
			if (a.layer === 0)
			{
				var newmag = 10**(a.sign*a.mag);
				if (Number.isFinite(newmag) && Math.abs(newmag) >= 0.1) { return FC(1, 0, newmag); }
				else
				{
					if (a.sign === 0) { return Decimal.dOne; }
					else { a = FC_NN(a.sign, a.layer+1, Math.log10(a.mag)); }
				}
			}
			
			//handle all 4 layer 1+ cases individually
			if (a.sign > 0 && a.mag > 0)
			{
				return FC(a.sign, a.layer+1, a.mag);
			}
			if (a.sign < 0 && a.mag > 0)
			{
				return FC(-a.sign, a.layer+1, -a.mag);
			}
			//both the negative mag cases are identical: one +/- rounding error
			return Decimal.dOne;
		};

		Decimal.prototype.pow_base = function (value) {
			return D(value).pow(this);
		};
		
		Decimal.prototype.root = function (value) {
			var decimal = D(value);
			return this.pow(decimal.recip());
		};

		Decimal.prototype.factorial = function () {
			if (this.mag < 0)
			{
				return this.toNumber().add(1).gamma();
			}
			else if (this.layer === 0)
			{
				return this.add(1).gamma();
			}
			else if (this.layer === 1)
			{
				return Decimal.exp(Decimal.mul(this, Decimal.ln(this).sub(1)));
			}
			else
			{
				return Decimal.exp(this);
			}
		};
		
		//from HyperCalc source code
		Decimal.prototype.gamma = function () {
			if (this.mag < 0)
			{
				return this.recip();
			}
			else if (this.layer === 0)
			{
				if (this.lt(FC_NN(1, 0, 24)))
				{
					return D(f_gamma(this.sign*this.mag));
				}
				
				var t = this.mag - 1;
				var l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
				l = (l+((t+0.5)*Math.log(t)));
				l = l-t;
				var n2 = t*t;
				var np = t;
				var lm = 12*np;
				var adj = 1/lm;
				var l2 = l+adj;
				if (l2 === l)
				{
					return Decimal.exp(l);
				}
				
				l = l2;
				np = np*n2;
				lm = 360*np;
				adj = 1/lm;
				l2 = l-adj;
				if (l2 === l)
				{
					return Decimal.exp(l);
				}
				
				l = l2;
				np = np*n2;
				lm = 1260*np;
				var lt = 1/lm;
				l = l+lt;
				np = np*n2;
				lm = 1680*np;
				lt = 1/lm;
				l = l-lt;
				return Decimal.exp(l);
			}
			else if (this.layer === 1)
			{
				return Decimal.exp(Decimal.mul(this, Decimal.ln(this).sub(1)));
			}
			else
			{
				return Decimal.exp(this);
			}
		};
		
		Decimal.prototype.lngamma = function () {
			return this.gamma().ln();
		};

		Decimal.prototype.exp = function () {
			if (this.mag < 0) { return Decimal.dOne; }
			if (this.layer === 0 && this.mag <= 709.7) { return D(Math.exp(this.sign*this.mag)); }
			else if (this.layer === 0) { return FC(1, 1, this.sign*Math.log10(Math.E)*this.mag); }
			else if (this.layer === 1) { return FC(1, 2, this.sign*(Math.log10(0.4342944819032518)+this.mag)); }
			else { return FC(1, this.layer+1, this.sign*this.mag); }
		};

		Decimal.prototype.sqr = function () {
			return this.pow(2);
		};

		Decimal.prototype.sqrt = function () {
			if (this.layer === 0) { return D(Math.sqrt(this.sign*this.mag)); }
			else if (this.layer === 1) { return FC(1, 2, Math.log10(this.mag)-0.3010299956639812); }
			else
			{
				var result = Decimal.div(FC_NN(this.sign, this.layer-1, this.mag), FC_NN(1, 0, 2));
				result.layer += 1;
				result.normalize();
				return result;
			}
		};

		Decimal.prototype.cube = function () {
			return this.pow(3);
		};

		Decimal.prototype.cbrt = function () {
			return this.pow(1/3);
		};
		
		//Tetration/tetrate: The result of exponentiating 'this' to 'this' 'height' times in a row.	https://en.wikipedia.org/wiki/Tetration
		//If payload != 1, then this is 'iterated exponentiation', the result of exping (payload) to base (this) (height) times. https://andydude.github.io/tetration/archives/tetration2/ident.html
		//Works with negative and positive real heights.
		Decimal.prototype.tetrate = function(height = 2, payload = FC_NN(1, 0, 1)) {
			if (height === Number.POSITIVE_INFINITY)
			{
				//Formula for infinite height power tower.
				var negln = Decimal.ln(this).neg();
				return negln.lambertw().div(negln);
			}
			
			if (height < 0)
			{
				return Decimal.iteratedlog(payload, this, -height);
			}

			// alemaninc code start
			if ((this.layer > Number.MAX_SAFE_INTEGER) || (height > Number.MAX_SAFE_INTEGER)) {return FC_NN(this.sign, this.layer + height, 1e10);}
			// alemaninc code end
			
			payload = D(payload);
			var oldheight = height;
			height = Math.trunc(height);
			var fracheight = oldheight-height;
		 
			if (fracheight !== 0)
			{
				if (payload.eq(Decimal.dOne))
				{
					++height;
					payload = new Decimal(fracheight);
				}
				else
				{
					if (this.eq(10))
					{
						payload = payload.layeradd10(fracheight);
					}
					else
					{
						payload = payload.layeradd(fracheight, this);
					}
				}
			}
			
			for (var i = 0; i < height; ++i)
			{
				payload = this.pow(payload);
				//bail if we're NaN
				if (!isFinite(payload.layer) || !isFinite(payload.mag)) { return payload; }
				//shortcut 
				if (payload.layer - this.layer > 3) { return FC_NN(payload.sign, payload.layer + (height - i - 1), payload.mag); }
				//give up after 100 iterations if nothing is happening
				if (i > 100) { return payload; }
			}
			return payload;
		};
		
		//iteratedexp/iterated exponentiation: - all cases handled in tetrate, so just call it
		Decimal.prototype.iteratedexp = function(height = 2, payload = FC_NN(1, 0, 1)) {
			return this.tetrate(height, payload);
		};
		
		//iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting (times) from the number's slog representation. Equivalent to tetrating to a negative height.
		//Works with negative and positive real heights.
		Decimal.prototype.iteratedlog = function(base = 10, times = 1) {			
			if (times < 0)
			{
				return Decimal.tetrate(base, -times, this);
			}
			
			base = D(base);
			var result = D(this);
			var fulltimes = times;
			times = Math.trunc(times);
			var fraction = fulltimes - times;
			if (result.layer - base.layer > 3)
			{
				var layerloss = Math.min(times, (result.layer - base.layer - 3));
				times -= layerloss;
				result.layer -= layerloss;
			}
			
			for (var i = 0; i < times; ++i)
			{
				result = result.log(base);
				//bail if we're NaN
				if (!isFinite(result.layer) || !isFinite(result.mag)) { return result; }
				//give up after 100 iterations if nothing is happening
				if (i > 100) { return result; }
			}
			
			//handle fractional part
			if (fraction > 0 && fraction < 1)
			{
				if (base.eq(10))
				{
					result = result.layeradd10(-fraction);
				}
				else
				{
					result = result.layeradd(-fraction, base);
				}
			}
			
			return result;
		};
		
		//Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate base to to get number. By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
		// https://en.wikipedia.org/wiki/Super-logarithm
		Decimal.prototype.slog = function(base = 10) {
			if (this.mag < 0) { return Decimal.dNegOne; }
			
			base = D(base);
			
			var result = 0;
			var copy = D(this);
			if (copy.layer - base.layer > 3)
			{
				var layerloss = (copy.layer - base.layer - 3);
				result += layerloss;
				copy.layer -= layerloss;
			}
			
			for (var i = 0; i < 100; ++i)
			{
				if (copy.lt(Decimal.dZero))
				{
					copy = Decimal.pow(base, copy);
					result -= 1;
				}
				else if (copy.lte(Decimal.dOne))
				{
					return D(result + copy.toNumber() - 1); //<-- THIS IS THE CRITICAL FUNCTION
					//^ Also have to change tetrate payload handling and layeradd10 if this is changed!
				}
				else
				{
					result += 1;
					copy = Decimal.log(copy, base);
				}
			}
			return D(result);
		};
		
		//Approximations taken from the excellent paper https://web.archive.org/web/20090201164836/http://tetration.itgo.com/paper.html !
		//Not using for now unless I can figure out how to use it in all the related functions.
		/*var slog_criticalfunction_1 = function(x, z) {
			z = z.toNumber();
			return -1 + z;
		}
		
		var slog_criticalfunction_2 = function(x, z) {
			z = z.toNumber();
			var lnx = x.ln();
			if (lnx.layer === 0)
			{
				lnx = lnx.toNumber();
				return -1 + z*2*lnx/(1+lnx) - z*z*(1-lnx)/(1+lnx);
			}
			else
			{
				var term1 = lnx.mul(z*2).div(lnx.add(1));
				var term2 = Decimal.sub(1, lnx).mul(z*z).div(lnx.add(1));
				Decimal.dNegOne.add(Decimal.sub(term1, term2));
			}
		}
		
		var slog_criticalfunction_3 = function(x, z) {
			z = z.toNumber();
			var lnx = x.ln();
			var lnx2 = lnx.sqr();
			var lnx3 = lnx.cube();
			if (lnx.layer === 0 && lnx2.layer === 0 && lnx3.layer === 0)
			{
				lnx = lnx.toNumber();
				lnx2 = lnx2.toNumber();
				lnx3 = lnx3.toNumber();
				
				var term1 = 6*z*(lnx+lnx3);
				var term2 = 3*z*z*(3*lnx2-2*lnx3);
				var term3 = 2*z*z*z*(1-lnx-2*lnx2+lnx3);
				var top = term1+term2+term3;
				var bottom = 2+4*lnx+5*lnx2+2*lnx3;
				
				return -1 + top/bottom;
			}
			else
			{
				var term1 = (lnx.add(lnx3)).mul(6*z);
				var term2 = (lnx2.mul(3).sub(lnx3.mul(2))).mul(3*z*z);
				var term3 = (Decimal.dOne.sub(lnx).sub(lnx2.mul(2)).add(lnx3)).mul(2*z*z*z);
				var top = term1.add(term2).add(term3);
				var bottom = new Decimal(2).add(lnx.mul(4)).add(lnx2.mul(5)).add(lnx3.mul(2));
				
				return Decimal.dNegOne.add(top.div(bottom));
			}
		}*/
		
		//Function for adding/removing layers from a Decimal, even fractional layers (e.g. its slog10 representation).
		//Everything continues to use the linear approximation ATM.
		Decimal.prototype.layeradd10 = function(diff) {
			diff = Decimal.fromValue_noAlloc(diff).toNumber();
			var result = D(this);
			if (diff >= 1)
			{
				var layeradd = Math.trunc(diff);
				diff -= layeradd;
				result.layer += layeradd;
			}
			if (diff <= -1)
			{
				var layeradd = Math.trunc(diff);
				diff -= layeradd;
				result.layer += layeradd;
				if (result.layer < 0)
				{
					for (var i = 0; i < 100; ++i)
					{
						result.layer++;
						result.mag = Math.log10(result.mag);
						if (!isFinite(result.mag)) { return result; }
						if (result.layer >= 0) { break; }
					}
				}
			}
			
			//layeradd10: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 10 and iterated log base 10. Also equivalent to adding a fractional amount to the number's layer in its break_eternity.js representation.
			if (diff > 0)
			{
				var subtractlayerslater = 0;
				//Ironically, this edge case would be unnecessary if we had 'negative layers'.
				while (Number.isFinite(result.mag) && result.mag < 10)
				{
					result.mag = 10**result.mag;
					++subtractlayerslater;
				}
				
				//A^(10^B) === C, solve for B
				//B === log10(logA(C))
				
				if (result.mag > 1e10)
				{
					result.mag = Math.log10(result.mag);
					result.layer++;
				}
				
				//Note that every integer slog10 value, the formula changes, so if we're near such a number, we have to spend exactly enough layerdiff to hit it, and then use the new formula.
				var diffToNextSlog = Math.log10(Math.log(1e10)/Math.log(result.mag), 10);
				if (diffToNextSlog < diff)
				{
					result.mag = Math.log10(1e10);
					result.layer++;
					diff -= diffToNextSlog;
				}
				
				result.mag = result.mag**10**diff;
				
				while (subtractlayerslater > 0)
				{
					result.mag = Math.log10(result.mag);
					--subtractlayerslater;
				}
			}
			else if (diff < 0)
			{
				var subtractlayerslater = 0;
				
				while (Number.isFinite(result.mag) && result.mag < 10)
				{
					result.mag = 10**result.mag;
					++subtractlayerslater;
				}
				
				if (result.mag > 1e10)
				{
					result.mag = Math.log10(result.mag);
					result.layer++;
				}
				
				var diffToNextSlog = Math.log10(1/Math.log10(result.mag));
				if (diffToNextSlog > diff)
				{
					result.mag = 1e10;
					result.layer--;
					diff -= diffToNextSlog;
				}
				
				result.mag = result.mag**10**diff;
				
				while (subtractlayerslater > 0)
				{
					result.mag = Math.log10(result.mag);
					--subtractlayerslater;
				}
			}
			
			while (result.layer < 0)
			{
				result.layer++;
				result.mag = Math.log10(result.mag);
			}
			result.normalize();
			return result;
		};
		
		//layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
		Decimal.prototype.layeradd = function(diff, base) {
			var slogthis = this.slog(base).toNumber();
			var slogdest = slogthis+diff;
			if (slogdest >= 0)
			{
				return Decimal.tetrate(base, slogdest);
			}
			else if (!Number.isFinite(slogdest))
			{
				return Decimal.dNaN;
			}
			else if (slogdest >= -1)
			{
				return Decimal.log(Decimal.tetrate(base, slogdest+1), base);
			}
			else
			{
				Decimal.log(Decimal.log(Decimal.tetrate(base, slogdest+2), base), base);
			}
		};
		
		//The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
		// https://en.wikipedia.org/wiki/Lambert_W_function
		//Some special values, for testing: https://en.wikipedia.org/wiki/Lambert_W_function#Special_values
		Decimal.prototype.lambertw = function() {
			if (this.lt(-0.3678794411710499))
			{
				throw Error("lambertw is unimplemented for results less than -1, sorry!");
			}
			else if (this.mag < 0)
			{
				return D(f_lambertw(this.toNumber()));
			}
			else if (this.layer === 0)
			{
				return D(f_lambertw(this.sign*this.mag));
			}
			else if (this.layer === 1)
			{
				return d_lambertw(this);
			}
			else if (this.layer === 2)
			{
				return d_lambertw(this);
			}
			if (this.layer >= 3)
			{
				return FC_NN(this.sign, this.layer-1, this.mag);
			}
		};
	
		//from https://github.com/scipy/scipy/blob/8dba340293fe20e62e173bdf2c10ae208286692f/scipy/special/lambertw.pxd
		// The evaluation can become inaccurate very close to the branch point
		// at ``-1/e``. In some corner cases, `lambertw` might currently
		// fail to converge, or can end up on the wrong branch.
		var d_lambertw = function(z, tol = 1e-10) {
			var w;
			var ew, wew, wewz, wn;
		
			if (!Number.isFinite(z.mag)) { return z; }
			if (z === 0)
			{
				return z;
			}
			if (z === 1)
			{
				//Split out this case because the asymptotic series blows up
				return OMEGA;
			}
		
			var absz = Decimal.abs(z);
			//Get an initial guess for Halley's method
			w = Decimal.ln(z);
		
			//Halley's method; see 5.9 in [1]
		
			for (var i = 0; i < 100; ++i)
			{
				ew = Decimal.exp(-w);
				wewz = w.sub(z.mul(ew));
				wn = w.sub(wewz.div(w.add(1).sub((w.add(2)).mul(wewz).div((Decimal.mul(2, w).add(2))))));
				if (Decimal.abs(wn.sub(w)).lt(Decimal.abs(wn).mul(tol)))
				{
					return wn;
				}
				else
				{
					w = wn;
				}
			}
		
			throw Error("Iteration failed to converge: " + z);
			//return Decimal.dNaN;
		};
		
		//The super square-root function - what number, tetrated to height 2, equals this?
		//Other sroots are possible to calculate probably through guess and check methods, this one is easy though.
		// https://en.wikipedia.org/wiki/Tetration#Super-root
		Decimal.prototype.ssqrt = function() {
			if (this.sign == 1 && this.layer >= 3)
			{
				return FC_NN(this.sign, this.layer-1, this.mag);
			}
			var lnx = this.ln();
			return lnx.div(lnx.lambertw());
		};
		/*

Unit tests for tetrate/iteratedexp/iteratedlog/layeradd10/layeradd/slog:

for (var i = 0; i < 1000; ++i)
{
		var first = Math.random()*100;
		var both = Math.random()*100;
		var expected = first+both+1;
		var result = new Decimal(10).layeradd10(first).layeradd10(both).slog();
		if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
		{
				console.log(first + ", " + both);
		}
}

for (var i = 0; i < 1000; ++i)
{
		var first = Math.random()*100;
		var both = Math.random()*100;
		first += both;
		var expected = first-both+1;
		var result = new Decimal(10).layeradd10(first).layeradd10(-both).slog();
		if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
		{
				console.log(first + ", " + both);
		}
}

for (var i = 0; i < 1000; ++i)
{
		var first = Math.random()*100;
		var both = Math.random()*100;
		var base = Math.random()*8+2;
		var expected = first+both+1;
		var result = new Decimal(base).layeradd(first, base).layeradd(both, base).slog(base);
		if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
		{
				console.log(first + ", " + both);
		}
}

for (var i = 0; i < 1000; ++i)
{
		var first = Math.random()*100;
		var both = Math.random()*100;
		var base = Math.random()*8+2;
		first += both;
		var expected = first-both+1;
		var result = new Decimal(base).layeradd(first, base).layeradd(-both, base).slog(base);
		if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
		{
				console.log(first + ", " + both);
		}
}

for (var i = 0; i < 1000; ++i)
{
	var first = Math.round((Math.random()*30))/10;
	var both = Math.round((Math.random()*30))/10;
	var tetrateonly = Decimal.tetrate(10, first);
	var tetrateandlog = Decimal.tetrate(10, first+both).iteratedlog(10, both);
	if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
	{
		console.log(first + ", " + both);
	}
}

for (var i = 0; i < 1000; ++i)
{
	var first = Math.round((Math.random()*30))/10;
	var both = Math.round((Math.random()*30))/10;
	var base = Math.random()*8+2;
	var tetrateonly = Decimal.tetrate(base, first);
	var tetrateandlog = Decimal.tetrate(base, first+both).iteratedlog(base, both);
	if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
	{
		console.log(first + ", " + both);
	}
}

for (var i = 0; i < 1000; ++i)
{
	var first = Math.round((Math.random()*30))/10;
	var both = Math.round((Math.random()*30))/10;
	var base = Math.random()*8+2;
	var tetrateonly = Decimal.tetrate(base, first, base);
	var tetrateandlog = Decimal.tetrate(base, first+both, base).iteratedlog(base, both);
	if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
	{
		console.log(first + ", " + both);
	}
}

for (var i = 0; i < 1000; ++i)
{
		var xex = new Decimal(-0.3678794411710499+Math.random()*100);
		var x = Decimal.lambertw(xex);
		if (!Decimal.eq_tolerance(xex, x.mul(Decimal.exp(x))))
		{
				console.log(xex);
		}
}

for (var i = 0; i < 1000; ++i)
{
		var xex = new Decimal(-0.3678794411710499+Math.exp(Math.random()*100));
		var x = Decimal.lambertw(xex);
		if (!Decimal.eq_tolerance(xex, x.mul(Decimal.exp(x))))
		{
				console.log(xex);
		}
}

for (var i = 0; i < 1000; ++i)
{
		var a = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
		var b = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
		if (Math.random() > 0.5) { a = a.recip(); }
		if (Math.random() > 0.5) { b = b.recip(); }
		var c = a.add(b).toNumber();
		if (Number.isFinite(c) && !Decimal.eq_tolerance(c, a.toNumber()+b.toNumber()))
		{
				console.log(a + ", " + b);
		}
}

for (var i = 0; i < 100; ++i)
{
		var a = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
		var b = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
		if (Math.random() > 0.5) { a = a.recip(); }
		if (Math.random() > 0.5) { b = b.recip(); }
		var c = a.mul(b).toNumber();
		if (Number.isFinite(c) && Number.isFinite(a.toNumber()) && Number.isFinite(b.toNumber()) && a.toNumber() != 0 && b.toNumber() != 0 && c != 0 && !Decimal.eq_tolerance(c, a.toNumber()*b.toNumber()))
		{
				console.log("Test 1: " + a + ", " + b);
		}
		else if (!Decimal.mul(a.recip(), b.recip()).eq_tolerance(Decimal.mul(a, b).recip()))
		{
				console.log("Test 3: " + a + ", " + b);
		}
}

for (var i = 0; i < 10; ++i)
{
		var a = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
		var b = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
		if (Math.random() > 0.5 && a.sign !== 0) { a = a.recip(); }
		if (Math.random() > 0.5 && b.sign !== 0) { b = b.recip(); }
		var c = a.pow(b);
		var d = a.root(b.recip());
		var e = a.pow(b.recip());
		var f = a.root(b);
		
		if (!c.eq_tolerance(d) && a.sign !== 0 && b.sign !== 0)
		{
			console.log("Test 1: " + a + ", " + b);
		}
		if (!e.eq_tolerance(f) && a.sign !== 0 && b.sign !== 0)
		{
			console.log("Test 2: " + a + ", " + b);
		}
}

for (var i = 0; i < 10; ++i)
{
		var a = Math.round(Math.random()*18-9);
		var b = Math.round(Math.random()*100-50);
		var c = Math.round(Math.random()*18-9);
		var d = Math.round(Math.random()*100-50);
		console.log("Decimal.pow(Decimal.fromMantissaExponent(" + a + ", " + b + "), Decimal.fromMantissaExponent(" + c + ", " + d + ")).toString()");
}

*/
		
		//Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
		// https://en.wikipedia.org/wiki/Pentation
		Decimal.prototype.pentate = function(height = 2, payload = FC_NN(1, 0, 1)) {
			payload = D(payload);
			var oldheight = height;
			height = Math.trunc(height);
			var fracheight = oldheight-height;
			
			//I have no idea if this is a meaningful approximation for pentation to continuous heights, but it is monotonic and continuous.
			if (fracheight !== 0)
			{
				if (payload.eq(Decimal.dOne))
				{
					++height;
					payload = new Decimal(fracheight);
				}
				else
				{
					if (this.eq(10))
					{
						payload = payload.layeradd10(fracheight);
					}
					else
					{
						payload = payload.layeradd(fracheight, this);
					}
				}
			}
			
			for (var i = 0; i < height; ++i)
			{
				payload = this.tetrate(payload);
				//bail if we're NaN
				if (!isFinite(payload.layer) || !isFinite(payload.mag)) { return payload; }
				//give up after 10 iterations if nothing is happening
				if (i > 10) { return payload; }
			}
			
			return payload;
		};
		
		// trig functions!
		Decimal.prototype.sin = function () {
			if (this.mag < 0) { return this; }
			if (this.layer === 0) { return D(Math.sin(this.sign*this.mag)); }
			return FC_NN(0, 0, 0);
		};

		Decimal.prototype.cos = function () {
			if (this.mag < 0) { return Decimal.dOne; }
			if (this.layer === 0) { return D(Math.cos(this.sign*this.mag)); }
			return FC_NN(0, 0, 0);
		};

		Decimal.prototype.tan = function () {
			if (this.mag < 0) { return this; }
			if (this.layer === 0) { return D(Math.tan(this.sign*this.mag)); }
			return FC_NN(0, 0, 0);
		};

		Decimal.prototype.asin = function () {
			if (this.mag < 0) { return this; }
			if (this.layer === 0) { return D(Math.asin(this.sign*this.mag)); }
			return FC_NN(Number.NaN, Number.NaN, Number.NaN);
		};

		Decimal.prototype.acos = function () {
			if (this.mag < 0) { return D(Math.acos(this.toNumber())); }
			if (this.layer === 0) { return D(Math.acos(this.sign*this.mag)); }
			return FC_NN(Number.NaN, Number.NaN, Number.NaN);
		};

		Decimal.prototype.atan = function () {
			if (this.mag < 0) { return this; }
			if (this.layer === 0) { return D(Math.atan(this.sign*this.mag)); }
			return D(Math.atan(this.sign*1.8e308));
		};

		Decimal.prototype.sinh = function () {
			return this.exp().sub(this.negate().exp()).div(2);
		};

		Decimal.prototype.cosh = function () {
			return this.exp().add(this.negate().exp()).div(2);
		};

		Decimal.prototype.tanh = function () {
			return this.sinh().div(this.cosh());
		};

		Decimal.prototype.asinh = function () {
			return Decimal.ln(this.add(this.sqr().add(1).pow(c.d0_5)));
		};

		Decimal.prototype.acosh = function () {
			return Decimal.ln(this.add(this.sqr().sub(1).pow(c.d0_5)));
		};

		Decimal.prototype.atanh = function () {
			if (this.abs().gte(1)) {
				return FC_NN(Number.NaN, Number.NaN, Number.NaN);
			}

			return Decimal.ln(this.add(1).div(D(1).sub(this))).div(2);
		};
		
		/**
		 * Joke function from Realm Grinder
		 */
		Decimal.prototype.ascensionPenalty = function (ascensions) {
			if (ascensions === 0) {
				return this;
			}

			return this.root(Decimal.pow(10, ascensions));
		};
		
		/**
		 * Joke function from Cookie Clicker. It's 'egg'
		 */
		Decimal.prototype.egg = function () {
			return this.add(9);
		};
		
		Decimal.prototype.lessThanOrEqualTo = function (other) {
			return this.cmp(other) < 1;
		};

		Decimal.prototype.lessThan = function (other) {
			return this.cmp(other) < 0;
		};

		Decimal.prototype.greaterThanOrEqualTo = function (other) {
			return this.cmp(other) > -1;
		};

		Decimal.prototype.greaterThan = function (other) {
			return this.cmp(other) > 0;
		};

		// ALEMANINC FUNCTIONS START HERE
		
		Decimal.prototype.mod = function (modulus) {
			return this.sub(this.div(modulus).floor().mul(modulus));
		};
		
		Decimal.prototype.safepow = function (exp) {
			return this.abs().pow(exp).mul(this.sign);
		};

		Decimal.prototype.layerf = function (callback) {			// This is a function which changes the layer of a number according to a callback. For example, layerf(x => x**2) will square the layer. Therefore, N(1e10).layerf(x => x*1.5) returns 10^^3, because slog(1e10)=2 and 2*1.5=3.
			let safeguard = Decimal.fromComponents(this.sign,this.layer,this.mag);
			let x = safeguard.quad_slog().toNumber();
			let height = callback(x);
			if (height===x) return safeguard;
			let neg_height = 0;					// The function breaks at negative heights
			while (height<0) {
				height++;
				neg_height++;
			}
			let output = FC_NN(1,0,10).quad_tetr(height);
			for (let i=0;i<neg_height;i++) output=output.log10();
			return output;
		};

		Decimal.prototype.layerplus = function(x) {
			if (x===0) return this
			let safeguard = Decimal.fromComponents(this.sign,this.layer,this.mag)
			if (x>0) {
				for (let i=0;i<x;i++) safeguard = safeguard.pow10()
			} else {
				for (let i=0;i<-x;i++) safeguard = safeguard.log10()
			}
			return safeguard
		}

		Decimal.prototype.dilate = function (exponent,layer) {
			if (exponent===1) return this
			let safeguard = Decimal.fromComponents(this.sign,this.layer,this.mag);
			if (layer === undefined) layer = 1;
			return safeguard.layerplus(-layer).safepow(exponent).layerplus(layer);
		};

		Decimal.prototype.digits = function (digits) {
			let x = this.floor().toString();
			return Array(digits-x.length+1).join("0")+x;
		};

		Decimal.prototype.simplex = function (iterations) {		 // iteration 2 = triangular numbers (1,3,6,10), iteration 3 = tetrahedral numbers (1,4,10,20), iteration 4 = pentatope numbers (1,5,15,35), etc.
			let output = new Decimal(1);
			for (let i=0;i<iterations;i++) output = output.mul(this.sub(1).div(i+1).add(1));
			return output;
		};

		Decimal.prototype.isNaN = function () {
			let x = Object.values(this);
			return (x.includes(NaN)||x.includes(Infinity));
		};

		Decimal.prototype.tetr_coefficient = function(x) {			// Linear to quadratic tetration height
			x=N(x);
			if (x.eq(constant.e)) return this;
			let coefficient = x.ln().mul(2).div(x.ln().add(1));
			return this.floor().add(coefficient.sub(coefficient.pow(2).sub(coefficient.mul(this.mod(1)).mul(4)).add(this.mod(1).mul(4)).pow(c.d0_5)).div(coefficient.sub(1).mul(2)));
		};

		Decimal.prototype.slog_coefficient = function(x) {			// Linear to quadratic superlogarithm
			x=N(x);
			if (x.eq(constant.e)) return this;
			let coefficient = x.ln().mul(2).div(x.ln().add(1));
			return this.floor().add(this.mod(1).mul(coefficient)).add(this.mod(1).pow(2).mul(1-coefficient));
		};

		Decimal.prototype.quad_tetr = function(x) {
			x=N(x);
			return this.tetrate(x.tetr_coefficient(this));
		};

		Decimal.prototype.quad_slog = function(x=10) {
			let safeguard = Decimal.fromComponents(this.sign,this.layer,this.mag);
			x=N(x);
			return N(safeguard.slog(x)).slog_coefficient(x);
		};

		Decimal.prototype.aps = function(p) {
			if (p.eq(1)) return this
			if (this.mul(p).lt(1e-10)) return this.mul(p)
			return this.add(1).pow(p).sub(1)
		}

		Decimal.prototype.format = function(precision) {
			return BEformat(this,precision);
		};

		Decimal.prototype.noLeadFormat = function(precision) {
			if (this.layer !== 0) return BEformat(this)
			let exponent = this.abs().log10().add(1e-8).floor()
			for (let i=0;i<precision;i++) if (Decimal.eq_tolerance(this.mul(Decimal.pow(10,i-exponent)),this.mul(Decimal.pow(10,i-exponent)).round(),1e-7)) return BEformat(this,i)
			return BEformat(this,precision)
		}
		return Decimal;
	}();

	Decimal.dZero = FC_NN(0, 0, 0);
	Decimal.dOne = FC_NN(1, 0, 1);
	Decimal.dNegOne = FC_NN(-1, 0, 1);
	Decimal.dTwo = FC_NN(1, 0, 2);
	Decimal.dTen = FC_NN(1, 0, 10);
	Decimal.dNaN = FC_NN(Number.NaN, Number.NaN, Number.NaN);
	Decimal.dInf = FC_NN(1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
	Decimal.dNegInf = FC_NN(-1, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
	Decimal.dNumberMax = FC(1, 0, Number.MAX_VALUE);
	Decimal.dNumberMin = FC(1, 0, Number.MIN_VALUE);
	
	return Decimal;

}));
function N(x) {
	return new Decimal(x);
}
function deepFreeze(obj) {
	Object.keys(obj).forEach(prop => {
		if (typeof obj[prop] === 'object') deepFreeze(obj[prop]);
	});
	return Object.freeze(obj);
};
const constant = deepFreeze({
	mmaxvalue	: Decimal.FC_NN(-1,Number.MAX_VALUE,1e10),
	mminvalue	: Decimal.FC_NN(-1,Number.MAX_VALUE,-1e10),
	d0				: Decimal.FC_NN(0,0,0),
	minvalue	: Decimal.FC_NN(1,Number.MAX_VALUE,-1e10),
	em30			: Decimal.FC_NN(1,1,-30),
	em10			: Decimal.FC_NN(1,0,1e-10),
	em5				: Decimal.FC_NN(1,0,1e-5),
	d1				: Decimal.FC_NN(1,0,1),
	d2				: Decimal.FC_NN(1,0,2),
	d2_4			: Decimal.FC_NN(1,0,2.4),
	e					: Decimal.FC_NN(1,0,2.7182818284590452),
	d3				: Decimal.FC_NN(1,0,3),
	d10				: Decimal.FC_NN(1,0,10),
	d24				: Decimal.FC_NN(1,0,24),
	d60				: Decimal.FC_NN(1,0,60),
	e3				: Decimal.FC_NN(1,0,1e3),
	d1024			: Decimal.FC_NN(1,0,1024),
	d3600			: Decimal.FC_NN(1,0,3600),
	e4				: Decimal.FC_NN(1,0,1e4),
	d86400		: Decimal.FC_NN(1,0,86400),
	d172800		: Decimal.FC_NN(1,0,172800),
	e6				: Decimal.FC_NN(1,0,1e6),
	d31556926	: Decimal.FC_NN(1,0,31556926),
	e9				: Decimal.FC_NN(1,0,1e9),
	e10				: Decimal.FC_NN(1,0,1e10),
	e33				: Decimal.FC_NN(1,1,33),
	ee4				: Decimal.FC_NN(1,1,1e4),
	ee5				: Decimal.FC_NN(1,1,1e5),
	maxvalue	: Decimal.FC_NN(1,Number.MAX_VALUE,1e10)
})
Object.defineProperty(JSON,"validDecimal",{
	value:function validDecimal(x) {
		if (x instanceof Decimal) return true;
		if (typeof x !== "string") return false;	// Regular numbers will remain numeric in JSON.
		if (x==="0") return true;									// Special case for Decimal 0
		if (N(x).isNaN()) return false;					 
		if (N(x).eq(constant.d0)) return false;					// If the variable evaluates to 0 but did not get stored as such, it's not a decimal.
		return true;															// If all of the above tests were false, it's probably a Decimal.
	}
})
Object.defineProperty(Array.prototype,"sumDecimals",{value:function sumDecimals() {
	return this.reduce((x,y) => x.add(y),c.d0);
}})
Object.defineProperty(Array.prototype,"productDecimals",{value:function productDecimals(){
	return this.reduce((x,y) => x.mul(y),c.d1);
}})
Object.defineProperty(Array.prototype,"decimalPowerTower",{value:function decimalPowerTower() {
	return this.reduceRight((x,y) => y.pow(x));
}})
const notationSupport = {
	formatSmall:function(x,p){
		let y=Math.max(0,p-Math.floor(x.max(constant.em10).min(constant.e10).log(constant.d10).toNumber()));
		if (x.lt(1000)) return x.toNumber().toFixed(y);
		if (x.lt(1000000)) return (Math.round(x.toNumber()*10**y)/10**y).toLocaleString("en-US");
		functionError("formatSmall",arguments)
	},
	leadingEs:function(x){return x.layer-((x.mag<1e6)?1:0)}
}
const notations = {
	"Alemaninc Ordinal":function(x){
		let output=x.mul(constant.e4).quad_slog().log(constant.d2).log(constant.d2).mul(constant.d2_4);
		if (output.gte(constant.d24)) {return "ω<sub>10,000,000,000</sub>"}
		let number=constant.d10.quad_tetr(output.mod(constant.d1).add(constant.d1));
		let precision=constant.e4.div(number).log(constant.d10).floor().max(constant.d0).pow10();
		return ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ","τ","υ","φ","χ","ψ","ω"][output.floor().toNumber()]+"<sub>"+number.mul(precision).floor().div(precision).toNumber().toLocaleString("en-US")+"</sub>";
	},
	"BE Default":function(x){return x.toExponential(3)},
	"Engineering":function(x,sub="Engineering",p=2){
		if (x.gte("eeeee6")) {return notations["Hyper-E"](x,sub)}
		let leadingEs = notationSupport.leadingEs(x)
		if (leadingEs===0) {x=x.mul(1.0000001);return x.log10().mod(constant.d3).pow10().toPrecision(p+1)+"e"+x.log10().div(constant.d3).floor().mul(constant.d3).toNumber().toLocaleString("en-US")}
		return Array(leadingEs+1).join("e")+notations["Engineering"](x.layerplus(-leadingEs),sub,3)
	},
	"Hyper-E":function(x,sub="Hyper-E"){
		let height = Math.floor(x.slog().toNumber())
		if (height>1e6) {return "E#"+notations[sub](N(height),sub)}
		return "E"+((x.mag>=1e10)?Math.log10(Math.log10(x.mag)):Math.log10(x.mag)).toFixed(3)+"#"+height.toLocaleString("en-US")
	},
	"Infinity":function(x,sub="Infinity"){
		if (x.gte("eeeee6")) {return (Math.log2(x.quad_slog(constant.d10).toNumber())/1024).toFixed(6)+"Ω"}
		let infinities = 0
		while (x.gte(c.e6)) {
			x = x.log2().div(c.d1024)
			infinities++
		}
		return (x.gt(c.d1)?x.toPrecision(6):x.toFixed(6))+"∞"+((infinities===1)?"":("<sup>"+infinities+"</sup>"))
	},
	"Logarithm":function(x,sub="Logarithm",p=3) {
		if (x.gte("eeeee6")) return notations["Hyper-E"](x,sub)
		let leadingEs = notationSupport.leadingEs(x)
		if (leadingEs===0) {x=x.mul(1.0000001);return "e"+notationSupport.formatSmall(x.log10(),p)}
		return Array(leadingEs+1).join("e")+notations["Logarithm"](x.layerplus(-leadingEs),sub,4)
	},
	"Mixed scientific":function(x,sub="Mixed scientific",p=2){
		if (x.gte("eeeee6")) {return notations["Hyper-E"](x,sub)}
		let leadingEs = notationSupport.leadingEs(x)
		if (leadingEs===0) {return notations[x.gte(constant.e33)?"Scientific":"Standard"](x,sub,p)}
		return Array(leadingEs+1).join("e")+notations["Mixed scientific"](x.layerplus(-leadingEs),sub,3)
	},
	"Scientific":function(x,sub="Scientific",p=2){
		if (x.gte("eeeee6")) return notations["Hyper-E"](x,sub)
		let leadingEs = notationSupport.leadingEs(x)
		if (x.layerplus(-leadingEs).gte(constant.ee4)) {p--}
		if (x.layerplus(-leadingEs).gte(constant.ee5)) {p--}
		if (leadingEs===0) {x=x.mul(1.0000001);return x.log10().mod(constant.d1).pow10().mul(10**p).floor().div(10**p).toFixed(p)+"e"+x.log10().floor().toNumber().toLocaleString("en-US")}
		return Array(leadingEs+1).join("e")+notations["Scientific"](x.layerplus(-leadingEs),sub,3)
	},
	"Standard":function(x,sub="Standard",p=2){
		if (x.gte("eeeee6")) return notations["Hyper-E"](x,sub)
		let leadingEs = Math.max(x.layer-((x.mag>=33)?1:2),0)    // standard notation adds leading e's at ee33 rather than ee6
		if (leadingEs===0) {
			if (x.lt(constant.e33)) return x.log10().mod(constant.d3).pow10().toPrecision(p+1)+" "+["M","B","T","Qa","Qt","Sx","Sp","Oc","No"][Math.floor(x.log10().toNumber()/3-2)]
			let e0 = ["","U","D","T","Qa","Qt","Sx","Sp","O","N"]
			let e1 = ["","Dc","Vg","Tg","Qd","Qi","Se","St","Og","Nn"]
			let e2 = ["","Ce","Dn","Tc","Qe","Qu","Sc","Si","Oe","Ne"]
			let e3 = ["QC-","RN-","YC-","ZP-","AT-","FM-","PC-","NA-","MC-","MI-",""] // reverse order
			let height = x.log10().div(constant.d3).sub(constant.d1).floor().toNumber()
			let e3vals = [10,9,8,7,6,5,4,3,2,1,0].map(x=>Math.floor((height/1e3**x)%1e3))
			let firste3 = e3vals.map(x=>x>0).indexOf(true)
			let out = ""
			for (let i=firste3;i<Math.min(firste3+2,11);i++) {
				if (e3vals[i]===0) continue;
				let values = String(e3vals[i]).padStart(3,"0").split("")
				if (e3vals[i]>1||i===10) out+=e0[values[2]]+e1[values[1]]+e2[values[0]]
				out+=e3[i]
			}
			if (out.substring(out.length-1)==="-") {out = out.substring(0,out.length-1)}
			if (height>=1e5) {out += "s"}
			else {out = x.log10().mod(constant.d3).pow10().toPrecision(p+1)+" "+out}
			return out
		}
		return Array(leadingEs+1).join("e")+notations["Standard"](x.layerplus(-leadingEs),sub,3)
	},
	"Tetration":function(x,sub="Tetration"){
		let height = x.slog()
		if (height<1e6) {return "10 ⇈ "+height.toPrecision(6)}
		return "10 ⇈ "+notations[sub](height,sub,5)
	},
	"Time":function(x){
		let hours=x.mul(constant.e4).quad_slog().log(constant.d2).log(constant.d2).mul(constant.d2_4);
		let minutes=hours.mod(constant.d1).mul(constant.d60)
		let seconds=minutes.mod(constant.d1).mul(constant.d60)
		return [hours,minutes,seconds].map(x=>x.floor().toString().padStart(2,"0")).join(":")
	}
}
function gformat(value,precision=0,notation="Scientific",subnotation=notation) {
	if ([value,precision,notation,subnotation].includes(undefined)) functionError("gformat",arguments)
	let x=N(value);
	if (x.sign===-1) return "-"+gformat(x.abs(),precision,notation,subnotation);
	if (x.eq(constant.maxvalue)) return "Infinite";
	if (x.eq(constant.maxvalue.recip())) return "0"
	if (x.isNaN()) return "NaN";
	if (x.eq(constant.d0)) return "0";
	if (x.lt(constant.em5)) return "(1 ÷ "+gformat(x.recip(),precision,notation,subnotation)+")";
	if (x.lt(constant.e6)) return notationSupport.formatSmall(x,precision)
	return notations[notation](x,subnotation)
}
function timeFormat(x) {
	x = N(x);
	if (x.eq(constant.d0)) return "0 seconds";
	if (x.eq(Infinity)) return "Infinite time";
	if (x.lt(constant.d0)) return "-"+timeFormat(x.neg())
	if (x.lt(constant.em30)) return "(1 ÷ "+x.recip().noLeadFormat(2)+") seconds";
	if (x.lt(constant.d1)) {
		let exp = x.log10().div(constant.d3).neg().ceil();
		let num = x.mul(constant.e3.pow(exp)).noLeadFormat(2)
		let unit = ["milli","micro","nano","pico","femto","atto","zepto","yocto","ronto","quecto"][exp.toNumber()-1]+"second"+((num==="1")?"":"s");
		return num+" "+unit;
	}
	if (x.lt(constant.d60)) return x.noLeadFormat(2)+" seconds";
	if (x.lt(constant.d3600)) return x.div(constant.d60).digits(2)+":"+x.mod(constant.d60).digits(2);
	if (x.lt(constant.d86400)) return x.div(constant.d3600).digits(2)+":"+x.div(constant.d60).mod(constant.d60).digits(2)+":"+x.mod(constant.d60).digits(2);
	if (x.lt(constant.e9)) return x.div(constant.d86400).floor()+" day"+(x.gte(constant.d172800)?"s":"")+" "+x.div(constant.d3600).mod(constant.d24).digits(2)+":"+x.div(constant.d60).mod(constant.d60).digits(2)+":"+x.mod(constant.d60).digits(2);
	return BEformat(x.div(constant.d31556926),2)+" years";
}
function rateFormat(x) {
	x = N(x);
	if (!Decimal.valid(x)) throw "Cannot access rateFormat("+x+")"
	if (x.sign === 0) return "0 per second"
	if (x.sign === -1) return "-"+rateFormat(x.neg())
	if (x.eq(constant.d1)) return "1 per second"
	if (x.gt(constant.d1)) return x.noLeadFormat(2)+" per second"
	if (x.lt(constant.d1)) return "1 per "+timeFormat(x.recip())
	throw "Cannot access rateFormat("+x+")"
}
function decimalStructuredClone(obj) {
	if (typeof obj === "object") {
		if (obj === null) {
			return null
		} else if (obj instanceof Array) {
			return obj.map(x=>decimalStructuredClone(x))
		} else if (obj instanceof Decimal) {
			return N(obj)
		} else {
			let out = {}
			for (let i of Object.keys(obj)) out[i] = decimalStructuredClone(obj[i])
			return out
		}
	} else {
		return obj
	}
}