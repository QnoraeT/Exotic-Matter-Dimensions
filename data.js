"use strict";
/*
Everything that is represented in "g" as an object generated from a list of keys is stored here and executed directly before main.js.
*/
const axisCodes = "XYZWVUTS".split("");
const fullAxisCodes = axisCodes.map(x=>[x,"dark"+x,"anti"+x]).flat()

const starList = countTo(10).map(x=>countTo(4).map(y=>x*10+y)).flat()

const studies = [
	{    // 0 is used for utilities
		exactFrames:" All frames are exactly 50 milliseconds long, and any excess time is converted to dilated time.",
		effectiveMaxCompletions:{}
	},
	{
		name:"Autonomy",
		unlockReq:function(){return c.e3.mul(studyPower(1)+1)},
		description:function() {return "You can't enter the Stardust or Automation tabs, or any subtabs in Main except Offline Time. However, everything inside these tabs still works normally. Also, all hotkeys are disabled."},
		research:"r5_7",
		goal:function(comp=studyPower(1)) {return [N(1000),N(2000),N(3000),N(4000)][comp]},
		reward:function(num,comp=g.studyCompletions[1]) {
			if (num==1) return [c.d0,c.d0_2,c.d0_33,c.d0_42,c.d0_5][comp];
			if (num==2) {
				if (comp==0) return 0
				let achievementFactor = Math.log2((totalAchievements>80)?(totalAchievements/64):(1+totalAchievements**5/1.31072e10))+1
				return 10*(comp-countTo(comp).map(x=>achievementFactor**(x-5)).sum())*studyRewardBoost(1,2).toNumber()
			}
			if (num==3) return [c.d1,c.d4,c.d20,c.d125,c.e3][comp].pow(studyRewardBoost(1,3));
			functionError("studies[1].reward",arguments)
		},
		reward_desc:function() {return [
			"Empower "+studyRewardHTML(1,1,1)+"% of your Y axis",
		 	"Increase the effect of stardust upgrade #2 by "+studyRewardHTML(1,2,2)+"% (based on achievements)",
			"Multiply hawking radiation gain by "+studyRewardHTML(1,3,0)
		]},
		rewardFormulas:{
			2:(comp=g.studyCompletions[1],ach=totalAchievements)=>studyRewardBoost(1,2).mul(c.d10).noLeadFormat(3)+" × Σ<span class=\"xscript\"><sup>"+comp+"</sup><sub>1</sub></span>(1 - ("+(ach>=80?"A ÷ 64":("1 + A<sup>5</sup> ÷ "+BEformat(1.31072e10)))+")<sup>n-5</sup>)"
		}
	},
	{
		name:"Big Bang Theory",
		unlockReq:function(){return N(["e7e3","e1e4","e12500","e4e4"][studyPower(2)])},
		description:function() {return "Star costs increase much faster and stars must be purchased in a different order, but each unspent star acts as a free dark star.";},
		research:"r5_9",
		goal:function(comp=studyPower(2)) {return [c.d800,c.d950,c.d1100,N(2100)][comp];},
		reward:function(num,comp=g.studyCompletions[2]) {
			if (num==1) return [c.d0,c.d9,c.d16,c.d21,c.d25][comp];
			if (num==2) return [c.d0,c.d0_07,c.d0_12,c.d0_16,c.d0_2][comp].mul(studyRewardBoost(2,2)).add(c.d1);
			if (num==3) return [c.d0,c.d0_25,c.d0_45,c.d0_6,c.d0_75][comp].mul(studyRewardBoost(2,3));
			functionError("studies[2].reward",arguments)
		},
		reward_desc:function() {return [
			"The post-25 star cost scaling is "+studyRewardHTML(2,1,0)+"% weaker",
			"Row 9 star effects are raised to the power of "+studyRewardHTML(2,2,2),
			"Each unspent star acts as "+studyRewardHTML(2,3,2)+" free dark stars. Allocated stars count as half of this value. Does not work in Study II."
		]}
	},
	{
		name:"Analgesia",
		unlockReq:function(){return [c.ee8,c.ee9,N("e5e9"),N("e1e12")][studyPower(3)]},
		energyGainConstant:function(){return [N(1000),N(2000),N(3000),N(4000)][studyPower(3)]},
		energyPowerConstant:function(){return [c.dm1,c.dm2,c.dm5,N(-20)][studyPower(3)]},
		description:function(){return "Energy increases "+this.energyGainConstant().format(0)+"× faster, but all other Energy speed and effect multipliers are disabled. Energies severely reduce production instead of boosting it (x<sup>"+this.energyPowerConstant().format()+"</sup>), and you start with all Energies unlocked."+studies[0].exactFrames},
		research:"r9_2",
		goal:function(comp=studyPower(3)){return [c.d2e3,N(2200),N(2400),N(2700)][comp];},
		reward:function(num,comp=g.studyCompletions[3]){
			if (num==1) return comp
			if (num==2) return [c.d0,N(0.2),N(0.35),N(0.45),N(0.5)][comp].mul(studyRewardBoost(3,2))
			if (num==3) {
				let out = c.d1
				for (let i=0;i<comp;i++) out = out.add(g.truetimeThisWormholeReset.div(c.d10.pow(i)).pow(i==0?0.5:i))
				return out.pow(studyRewardBoost(3,3))
			}
			functionError("studies[3].reward",arguments)
		},
		reward_desc:function(){return [
			"Increase the cap of Stardust Upgrade #5 by "+studyRewardHTML(3,1,0),
			"Keep ^"+studyRewardHTML(3,2,studyRewardBoost(3,2).eq(c.d1)?1:3)+" of each of the first six Energies on Stardust reset",
			"Meta energy increases "+studyRewardHTML(3,3,2)+"× faster (based on game-time in this Wormhole)"
		]},
		rewardFormulas:{
			3:function(comp=g.studyCompletions[3]){
				let out = "1 + Σ<span class=\"xscript\"><sup>"+(comp-1)+"</sup><sub>0</sub></span>(t ÷ 10<sup>n</sup>)<sup>max(n, 0.5)</sup>"
				if (studyRewardBoost(3,3).eq(c.d1)) return out
				return "("+out+")<sup>"+studyRewardBoost(3,3).noLeadFormat(3)+"</sup>"
 			}
		}
	},
	{
		name:"Vacuum Decay",
		unlockReq:function() {return [N(1e144),c.inf,N("4.44e444"),c.inf.pow(c.d2)][studyPower(4)]},
		description:function(){return "Every Stardust reset you do raises stardust gain to the power of 0.5 for the rest of the Study."},
		research:"r9_14",
		goal:function(comp=studyPower(4)){return [N(3000),N(3700),N(4500),N(5400)][comp]},
		reward:function(num,comp=g.studyCompletions[4]){
			if (num==1) return N([0.5,0.514,0.527,0.539,0.55][comp])
			if (num==2) return N([1,1.6,2.3,3.1,4][comp]).pow(studyRewardBoost(4,2))
			if (num==3) return [c.d1,c.d2_5,c.d5,c.d10,c.d20][comp].pow(studyRewardBoost(4,3).mul(c.d0_3))
			functionError("studies[4].reward",arguments)
		},
		reward_desc:function(){return [
			"Base stardust gain formula exponent is "+studyRewardHTML(4,1,2),
			"The effect of Mastery 42 is "+studyRewardHTML(4,2,2)+"× stronger",
			"The first effect of dark stars is "+studyRewardHTML(4,3,2)+"× stronger"
		]}
	},
	{
		name:"Scientific Illiteracy",
		unlockReq:function(){return [N("e4000"),N("e5880"),betaActive?N("e15625"):c.ee100,c.ee100][studyPower(5)]},
		difficultyConstant:function(){return [c.d32,N(64),N(128),N(256)][studyPower(5)]},
		description:function(){return "Entering this Study will immediately respec your Research, and all research costs will be multiplied by "+studies[5].difficultyConstant().format()+"."},
		research:"r2_8",
		goal:function(comp=studyPower(5)){return [N(4000),N(4000),betaActive?N(6200):c.e100,c.e100][comp]},
		reward:function(num,comp=g.studyCompletions[5]){
			if (num==1) return [c.d0,c.d80,c.d90,N(96),c.e2][comp]
			if (num==2) return c.d1.sub([c.d0,c.d0_01,N(29/1500),N(41/1500),N(1/30)][comp].mul(studyRewardBoost(5,2)))
			if (num==3) return [c.d0,N(2.5),N(10),N(30),N(60)][comp].mul(studyRewardBoost(5,3))
			functionError("studies[5].reward",arguments)
		},
		reward_desc:function(){return [
			"Research unlocked by Study V works at "+studyRewardHTML(5,1,0)+"% efficiency",
			"Observation costs are raised to the power of "+studyRewardHTML(5,2,4),
			"Subtract "+studyRewardHTML(5,3,2)+" from the cost of all research (cannot go below 0)"
		]}
	},
	{
		name:"Event Horizon",
		unlockReq:function(){return [N(500),N(1000),N(3750),c.e100][studyPower(6)]},
		effect:function(p=stat.totalDarkAxis.div(studies[6].goal()).min(c.d1)){return [c.d27,c.d30,c.e2,c.e3][studyPower(6)].pow(c.d1.sub(p)).pow10()},
		description:function(){return "The game runs "+this.effect(c.d0).format()+"× slower. However, as you get closer to the goal of the Study this penalty gradually reduces up to a minimum of 10×."},
		research:"r16_8",
		goal:function(comp=studyPower(6)){return [N(4500),N(4800),N(8888),c.e100][comp]},
		reward:function(num,comp=g.studyCompletions[6]){
			if (num==1) return [c.d1,c.d1_25,c.d1_5,c.d2,c.d4][comp]
			if (num==2) return N(comp/20).mul(studyRewardBoost(6,2))
			if (num==3) return N(0.0075*comp).mul(studyRewardBoost(6,3))
			functionError("studies[6].reward",arguments)
		},
		reward_desc:function(){return [
			"The effect of tickspeed on chroma gain is raised to the power of "+studyRewardHTML(6,1,4),
			"Tickspeed<sup>"+studyRewardHTML(6,2,3)+"</sup> affects the base gain of knowledge",
			"Research 8-2 is "+studyRewardHTML(6,3,2)+"% stronger per dark axis owned (currently: "+percentOrMult(studies[6].reward(3).mul(stat.totalDarkAxis).div(c.e2).add(c.d1))+")"
		]},
	},
	{
		name:"Luck Be In The Air Tonight",
		unlockReq:function(){return [N("6.66e666666666"),c.ee9,c.ee100,c.ee100][studyPower(7)]},
		description:function(){return "Each stardust reset gives luck essence based on the amount of stardust gained. The gain of exotic matter, mastery power, stardust and dark matter is raised to a power between "+N(1-studies[7].luckMaxReduction()).noLeadFormat(3)+" and 1 based on how close luck essence is to a multiple of 1,000."},
		luckEssenceGain:function(x=stat.pendingstardust.sub(g.stardust)){return (x.lt(c.d1)?c.d0:x.log10().log10().mul([444444,555555,666666,777777][studyPower(7)]).floor()).add(g.luckEssence).min(c.e15).sub(g.luckEssence).toNumber()},
		luckMaxReduction:function(){return 1},
		luckEffect:function(x=g.luckEssence){
			if (x==1e15) return N(1 - this.luckMaxReduction())   // to avoid randomness at high values always give the maximum penalty at 1e15 :D
			return N(1 - ((1-Math.cos(x*Math.PI/500))/2) * this.luckMaxReduction())
		},
		research:"r23_5",
		goal:function(comp=studyPower(7)){return [N(6666),N(7777),N(9777),N(11777)][comp]},
		reward:function(num,comp=g.studyCompletions[7]){
			if (num==1) return [c.d0,N(50),N(70),N(85),N(100)][comp]
			if (num==2) return [c.d0,c.d75,c.d90,N(98),c.d100][comp].mul(studyRewardBoost(7,2))
			if (num==3) return [g.hawkingradiation.add(c.e10).log10().log10().pow(comp).sub(c.d1),c.d0_001,studyRewardBoost(7,3)].productDecimals().pow10().sub(c.d1)
			functionError("studies[7].reward",arguments)
		},
		reward_desc:function(){return [
			"Empower "+studyRewardHTML(7,1,3)+"% of your dark W axis",
			"Research unlocked by Study VII works at "+studyRewardHTML(7,2,0)+"% efficiency",
			unlocked("Luck")?("Gain "+studyRewardHTML(7,3,2)+" luck shards per second (based on hawking radiation)"):"? ? ? (Complete to reveal)"
		]},
		rewardFormulas:{
			3:(comp=g.studyCompletions[7])=>"10<sup>(log<sup>[2]</sup>(HR + "+c.e10.format()+")"+formulaFormat.exp(N(comp))+" - 1)"+formulaFormat.mult(studyRewardBoost(7,2).div(c.e3))+"</sup> - 1"
		}
	},
	{
		name:"Masterful",
		unlockReq:function(){return [c.inf,c.ee100,c.ee100,c.ee100][studyPower(8)]},
		description:function(){return "All effects which allow you to activate more than 1 Mastery from each row are disabled, and dark matter gain is severely reduced if it exceeds your mastery power."},
		research:"r18_8",
		goal:function(comp=studyPower(8)){return [N(3800),c.e100,c.e100,c.e100][comp]},
		reward:function(num,comp=g.studyCompletions[8]) {
			if (num==1) return [c.d50,N(52.5),N(55),N(57.5),N(60)][comp]
			if (num==2) return [c.d0,c.d9,c.d16,c.d21,c.d24][comp].mul(studyRewardBoost(8,2))
			if (num==3) {return (comp>0)?[N(3240),N(8100),N(16200),N(25920)][comp-1].mul(studyRewardBoost(8,3)):g.achievement[310]?c.d900:c.d0}
			functionError("studies[8].reward",arguments)
		},
		reward_desc:function(){return [
			"Increase the knowledge effect limit to "+studyRewardHTML(8,1,2)+"%",
			"Mastery 85 is "+studyRewardHTML(8,2,2)+"% stronger per Tier 8 achievement (currently: "+studies[8].reward(2).mul(achievement.ownedInTier(8)).noLeadFormat(2)+"%)",
			"Add "+studyRewardHTML(8,3,x=>timeFormat(x))+" of real time to the mastery power gain timer"
		]}
	},
	{
		name:"Scientia est Experientia",
		unlockReq:function(){return [N(1.11e111),c.ee100,c.ee100,c.ee100][studyPower(9)]},
		description:function(){return "Exotic matter gain, dark matter gain and all divisors to normal and dark axis costs are reduced to 10<sup>log(base gain)<sup>"+this.experientiaEffect(c.d0).noLeadFormat(3)+"</sup></sup>. If not finished within "+studies[9].timePer().toFixed(0)+" seconds, the Study will reset itself, and you will gain or lose experientia based on your number of dark stars. Depending on how much experientia you have, the penalty of this Study is either increased or mitigated. "+studies[0].exactFrames},
		research:"r23_11",
		goal:function(comp=studyPower(9)){return N(999)},
		reward:function(num,comp=g.studyCompletions[9]){
			if (num==1) return [c.d0,N(9.99e9),N(9.99e99),c.inf,c.maxvalue][comp]
			if (num==2) return c.d0_5.pow(N(comp/3).mul(studyRewardBoost(9,2)))
			if (num==3) return [c.d0,c.d1,N(1.9),N(2.6),N(3)][comp].mul(studyRewardBoost(9,3))
		},
		reward_desc:function(){return [
			unlocked("Antimatter")?("Antimatter gain softcaps at "+studyRewardHTML(9,1,0)):"? ? ? (Complete to reveal)",
			"Galaxy Penalty 3 is "+studyRewardHTML(9,2,x=>c.d1.sub(x).mul(c.e2).noLeadFormat(3))+"% weaker",
			"All Spatial Synergism research is "+studyRewardHTML(9,3,2)+"% more effective"
		]},
		experientiaEffect:function(x=g.study9.xp,comp=g.studyCompletions[9]){
			let base = Decimal.decibel(-3-comp)
			let exp = x.gt(c.d0)?x.div(c.e2).add(c.d1).recip():x.div(c.e2).add(c.d1)
			return base.pow(exp)
		},
		timePer:function(){return [15,13,11,9][studyPower(9)]},
		timeLeft:function(type){return this.timePer()-g.timeThisWormholeReset},
		deltaXP:function(x=g.darkstars){
			let out = g.darkstars.sub(g.study9.xp.div(c.d10).add(c.e2).add(g.study9.resets))
			if (out.sign===-1) out = out.mul(c.d10)
			return out.floor()
		},
		formatChange:function(x=this.deltaXP()){return " ±+".split("")[this.deltaXP().sign+1]+this.deltaXP().format()},
		reset:function(){
			notify("Study IX has reset! "+this.formatChange()+" experientia","var(--exp)","#000000")
			let xp = g.study9.xp.add(this.deltaXP())
			let resets = g.study9.resets+1
			if (g.activeStudy===0) {wormholeReset()} else {enterStudy(g.activeStudy)} // Study X proofing
			g.study9.xp = xp
			g.study9.resets = resets
		}
	},
	{
		name:"Study of Studies",
		// no unlock requirement property due to 4 separate research
		description:function(){return "The conditions of "+["Studies I, IV and VII","Studies II, V and VIII","Studies III, VI and IX","any three previous Studies of your choice"][studyPower(10)]+" are all applied simultaneously."},
		research:["r26_5","r25_8","r26_11","r27_8"],
		goal:function(comp=studyPower(10)){return [c.e100,c.e100,c.e100,c.e100][studyPower(10)]},
		rewardStep:function(x,comp=g.studyCompletions[10]){return (comp===4)?2:(comp>=x)?1:0},
		reward:function(num,comp=g.studyCompletions[10]){
			if (num===1) return g.luckShards.add(c.d1).log10().mul([c.d0,c.d0_001,N(0.0015)][this.rewardStep(1,comp)]).add(c.d1)
			if (num===2) return N(10+g.stars+g.galaxies*6).log10().pow([c.d0,c.d0_03,c.d0_04][this.rewardStep(2,comp)])
			if (num===3) return g.antimatter.add(c.e10).layerplus(-3).mul([c.d0,c.d0_8,c.d1][this.rewardStep(3,comp)])
			if (num===4) return [c.d1,N(1.09),N(1.16),N(1.21),c.d1_25][comp]
		},
		reward_desc:function(){return [
			"[[Stardust]]<br>Multiply the U axis effect by "+studyRewardHTML(10,1,4)+" per achievement, based on luck shards (currently: "+studies[10].reward(5).pow(totalAchievements).noLeadFormat(3)+"×)",
			"[[Decision]]<br>The observation effect is raised to the power of "+studyRewardHTML(10,2,4)+" (based on stars and galaxies)",
			"[[Time]]<br>Tickspeed-to-energy conversion exponent is increased by "+studyRewardHTML(10,3,3)+" (based on antimatter)",
			"[[Ontology]]<br>The second reward of every other Study is "+studyRewardHTML(10,4,x=>x.sub(c.d1).mul(c.e2).format())+"% more effective",
		]},
		rewardFormulas:{
			1:function(comp=g.studyCompletions[10]){return "log(S + 1) × "+["0","0.001","0.0015"][this.rewardStep(1,comp)]+" + 1"},
			2:function(comp=g.studyCompletions[10]){return "(10 + ★ + G × 6)<sup>"+["0","0.03","0.04"][this.rewardStep(2,comp)]+"</sup>"},
			3:function(comp=g.studyCompletions[10]){return "log<sup>[3]</sup>(AM + "+c.e10+")"+formulaFormat.mult([c.d0,c.d0_8,c.d1][this.rewardStep(3,comp)])}
		}
	}
];
const fullStudyNames = [null,...countTo(studies.length-1).map(x=>(x===10)?studies[x].name:("Study "+roman(x)+": "+studies[x].name))]

const lightNames = ["red","green","blue","cyan","magenta","yellow","white","black","gray"]

const luckRunes = {
	trifolium:{baseCost:c.e4,scale:c.d1_01,upgBaseCost:c.d10,upgScale:c.d1_25},
	quatrefolium:{baseCost:c.e6,scale:c.d1_1,upgBaseCost:c.d4,upgScale:c.d1_5},
	cinquefolium:{baseCost:c.e9,scale:c.d3,upgBaseCost:c.d1,upgScale:c.d2}
}
const luckRuneTypes = Object.keys(luckRunes)
// luck upgrades use geometric scaling as a cost formula, but rounded down - calculate amount of upgrades at which rounding no longer matters
for (let i of luckRuneTypes) luckRunes[i].noRoundThreshold = c.e16.div(luckRunes[i].upgBaseCost).log(luckRunes[i].upgScale).ceil()
const luckUpgrades = {
	trifolium:{
		normalAxis:{
			name:"Exotic Matter",
			desc:"Normal axis costs are raised to the power of {}",
			eff:(x=g.luckUpgrades.trifolium.normalAxis)=>c.d99.div(c.d99.add(x)),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"99 ÷ (99 + λ)"
		},
		darkAxis:{
			name:"Dark Matter",
			desc:"Dark axis costs are raised to the power of {}",
			eff:(x=g.luckUpgrades.trifolium.darkAxis)=>c.d99.div(c.d99.add(x)),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"99 ÷ (99 + λ)"
		},
		antiAxis:{
			name:"Antimatter",
			desc:"Anti-axis costs are raised to the power of {}",
			eff:(x=g.luckUpgrades.trifolium.antiAxis)=>c.d99.div(c.d99.add(x).sub(x.div(c.d10).add(c.d1).ln().mul(c.d10))),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"99 ÷ (99 + λ - 10 × ln(1 + λ ÷ 10))",
			unlocked:function(){return g.research.r26_2}
		}
	},
	quatrefolium:{
		star:{
			name:"Stars",
			desc:"Star costs are raised to the power of {}",
			eff:(x=g.luckUpgrades.quatrefolium.star)=>[c.d0_95,x,N(0.8786509132956299)].decimalPowerTower(),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"0.95<sup>λ<sup>0.87865</sup></sup>"
		},
		darkstar:{
			name:"Dark Stars",
			desc:"Dark star costs are divided by {}",
			eff:(x=g.luckUpgrades.quatrefolium.darkstar)=>x.gt(c.d20)?x.add(c.d5).sqrt().sub(c.d5).div(c.d4).exp().mul(c.d2):x.div(c.d20).add(c.d1),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>g.luckUpgrades.quatrefolium.darkstar.gte(c.d20)?"e<sup>(λ + 5)<sup>0.5</sup> - 5) ÷ 4</sup> × 2":"1 + λ ÷ 20"
		},
		synergism:{
			name:"Synergism",
			desc:"Spatial Synergism research is {}% more effective",
			eff:(x=g.luckUpgrades.quatrefolium.synergism)=>x.gt(c.d50)?x.div(c.d10).sub(c.d4).ln().div(c.d20).add(c.d1_25):x.div(c.d200).add(c.d1),
			format:(x=this.eff())=>x.sub(c.d1).mul(c.e2).noLeadFormat(3),
			formula:()=>g.luckUpgrades.quatrefolium.synergism.gte(c.d50)?"25 + ln(λ ÷ 10 - 4) × 5":"λ ÷ 2"
		},
		prismatic:{
			name:"Quadrahedron",
			get desc(){return "Increase the base of "+prismaticUpgradeName("prismaticSpeed")+" by {}"},
			eff:(x=g.luckUpgrades.quatrefolium.prismatic)=>x.add(c.d1).mul(c.e10).layerplus(-3).pow(c.d2).mul(32.5),
			format:(x=this.eff())=>x.noLeadFormat(4),
			formula:()=>"32.5 × log<sup>[3]</sup>((λ + 1) × "+c.e10.format()+")<sup>2</sup>",
			unlocked:function(){return g.research.r26_2}
		}
	},
	cinquefolium:{
		observation:{
			name:"Science",
			desc:"Observation costs are raised to the power of {}",
			eff:(x=g.luckUpgrades.cinquefolium.observation)=>c.d400.div(x.gt(c.e2)?x.div(c.d25).sub(c.d3).ln().mul(c.d25).add(c.d500):x.add(c.d400)),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"400 ÷ ("+(g.luckUpgrades.cinquefolium.observation.gte(c.d2)?"25 × ln(λ ÷ 25 - 3) + 500":"λ + 400")+")"
		},
		chroma:{
			name:"Chroma",
			desc:"Chroma gain is multiplied by {} (based on total lumens)",
			eff:(x=g.luckUpgrades.cinquefolium.chroma)=>x.eq(c.d0)?c.d1:g.lumens.map(i=>i.add(c.d10).log10().pow(x.ln().add(c.d1))).sumDecimals().div(c.e2).pow10(),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>"10<sup>Σ<span class=\"xscript\"><sup>9</sup><sub>1</sub></span>(log(L<sub>n</sub> + 10)<sup>ln(λ) + 1</sup>) ÷ 100"
		},
		axis:{
			name:"Space",
			desc:"Gain free normal and dark axis of the first seven types equal to sqrt(purchased axis) × {}",
			eff:(x=g.luckUpgrades.cinquefolium.axis)=>x.gt(c.d20)?x.sub(c.d10).log10().pow(c.d1_15).mul(c.d10):x.div(c.d2),
			format:(x=this.eff())=>x.noLeadFormat(3),
			formula:()=>g.luckUpgrades.cinquefolium.axis.gte(c.d20)?"10 × log(λ - 10)<sup>1.15</sup>":"λ ÷ 2"
		},
		radiation:{
			name:"Radiation",
			desc:"Multiply hawking radiation gain by {}",
			eff:(x=g.luckUpgrades.cinquefolium.radiation)=>c.d256.pow(x),
			format:(x=this.eff())=>x.format(),
			formula:()=>"256<sup>λ</sup>"
		},
		luck:{
			name:"Cinquefolium",
			desc:"Luck shard gain is raised to the power of {}",
			eff:(x=g.luckUpgrades.cinquefolium.luck)=>x.pow(x.max(c.d10).log10()).div(c.e2).add(c.d1),
			format:(x=this.eff())=>x.noLeadFormat(2),
			formula:()=>"1 + λ<sup>log(max(λ, 10))</sup> ÷ 100",
			unlocked:function(){return g.research.r26_2}
		}
	}
}
const luckUpgradeList = Object.fromEntries(luckRuneTypes.map(x=>[x,Object.keys(luckUpgrades[x])]))
/*
- name, desc, eff, format and formula are universal to all prismatic upgrades
- each upgrade is also either:
	- unlimited: can be bought unlimited times and has geometric cost scaling optimized for bulk purchases. properties: baseCost, scale
  - limited: has a finite maximum level and unique cost formulas: when bulk bought, costs are summed one at a time. properties: cost, max
- upgrades which have adverse effects also have the 'refundable' property set to true
*/
const prismaticUpgrades = {
	prismaticSpeed:{
		name:"Prismatic Amplifier",
		desc:"Prismatic gain is multiplied by {x}",
		base:function(){return c.d1_5.add(luckUpgrades.quatrefolium.prismatic.eff())},
		softcap:function(){return c.e2},
		eff:function(x=g.prismaticUpgrades.prismaticSpeed){
			let ss = prismaticUpgrades.prismaticSpeed.softcap()
			return prismaticUpgrades.prismaticSpeed.base().pow(Decimal.div(x,x.max(ss).log(ss)))
		},
		format:{x:(x=prismaticUpgrades.prismaticSpeed.eff())=>x.noLeadFormat(2)},
		formula:{x:function(){
			let ss = prismaticUpgrades.prismaticSpeed.softcap()
			return prismaticUpgrades.prismaticSpeed.base().noLeadFormat(4)+"<sup>"+(g.prismaticUpgrades.prismaticSpeed.gte(c.e2)?"λ ÷ log<sub>"+ss.format()+"</sub>(λ)":"λ")+"</sup>"
		}},
		variables:"x",
		baseCost:c.d10,
		scale:c.d2
	},
	chromaSpeed:{
		name:"Chromatic Amplifier",
		desc:"Chroma gain is multiplied by {x}",
		eff:(x=g.prismaticUpgrades.chromaSpeed)=>Decimal.sub(x.add(c.d99).log10(),N(66).div(N(98).add(x))).pow(x),
		format:{x:(x=prismaticUpgrades.chromaSpeed.eff())=>x.noLeadFormat(2)},
		formula:{x:()=>"(log(λ + 99) - 66 ÷ (λ + 98))<sup>λ</sup>"},
		variables:"x",
		baseCost:c.d10,
		scale:c.d2
	},
	chromaOverdrive:{
		name:"Chromatic Overdrive",
		desc:"Chroma gain is multiplied by {x}, but chroma generation is {y}× more expensive. Having at least 1 level of this makes red, green and blue chroma cost gray chroma.",
		eff:{
			x:(x=g.prismaticUpgrades.chromaOverdrive)=>c.d8.pow(x),
			y:(x=g.prismaticUpgrades.chromaOverdrive)=>c.d2.pow(x.div(c.d3))
		},
		format:{
			x:(x=prismaticUpgrades.chromaOverdrive.eff.x())=>x.format(),
			y:(x=prismaticUpgrades.chromaOverdrive.eff.y())=>x.noLeadFormat(2)
		},
		formula:{
			x:()=>"8<sup>λ</sup>",
			y:()=>"2<sup>λ ÷ 3</sup>"
		},
		variables:"xy",
		baseCost:c.e2,
		scale:c.d10,
		refundable:true
	},
	lumenThresholdReduction1:{
		name:"Lumen Increaser I",
		desc:"The gray lumen threshold increase is reduced to {x}×",
		eff:(x=g.prismaticUpgrades.lumenThresholdReduction1)=>x.eq(c.e5)?c.d10:x.eq(c.d0)?c.e10:x.gt(c.d10)?c.d40.sub(x.log10().add(c.d1).pow(c.d2)).div(c.d4).pow10():x.gt(c.d2)?c.e10.div(x):c.e10.sub(x.mul(2.5e9)),
		format:{x:(x=prismaticUpgrades.lumenThresholdReduction1.eff())=>x.noLeadFormat(3)},
		formula:{x:()=>g.prismaticUpgrades.lumenThresholdReduction1.gte(c.d10)?"10<sup>(40 - (log(λ) + 1)<sup>2</sup>) ÷ 4</sup>":(BEformat(3e10)+" ÷ max(3 × λ, 3 + λ)")},
		variables:"x",
		cost:(x=g.prismaticUpgrades.lumenThresholdReduction1)=>(x.gt(c.d10)?x.div(c.d20).add(c.d1):c.d1_5).pow(x.gt(c.e2)?x.pow(c.d2).div(c.e2):x).mul(c.e12),
		costFormula:(x=g.prismaticUpgrades.lumenThresholdReduction1)=>(x.gte(c.d10)?"(1 + λ ÷ 20)":"1.5")+"<sup>"+(x.gte(c.e2)?"λ<sup>2</sup> ÷ 100":"λ")+"</sup> × 10<sup>12</sup>",
		max:c.e5
	},
	lumenThresholdReduction2:{
		name:"Lumen Increaser II",
		desc:"The black and white lumen threshold increases are reduced to {x}×",
		eff:(x=g.prismaticUpgrades.lumenThresholdReduction2)=>x.eq(c.e2)?c.d5:x.eq(c.d0)?c.d10:c.d10.sub(x.div(c.d20)),
		format:{x:(x=prismaticUpgrades.lumenThresholdReduction2.eff())=>x.noLeadFormat(3)},
		formula:{x:()=>"10 - λ ÷ 20"},
		variables:"x",
		cost:function(x=g.prismaticUpgrades.lumenThresholdReduction2){
			let base = x.gte(c.d20)?x:c.d12
			let exp = x
			if (x.gte(c.d40)) exp = exp.mul(exp.div(c.e2).add(c.d1).pow(x.div(c.d20).sub(c.d1).floor()))
			return base.pow(exp).mul(c.e9)
		},
		costFormula:(x=g.prismaticUpgrades.lumenThresholdReduction2)=>(x.gte(c.d20)?"λ":"12")+"<sup>"+(x.gte(c.d40)?("λ × (1 + λ ÷ 100)"+formulaFormat.exp(x.div(c.d20).sub(c.d1).floor())):"λ")+"</sup> × 10<sup>9</sup>",
		max:c.e2
	},
	lumenThresholdReduction3:{
		name:"Lumen Increaser III",
		desc:"The threshold increases of the first six lumens are reduced by {x}%",
		eff:(x=g.prismaticUpgrades.lumenThresholdReduction3)=>x.gt(c.e2)?x.log10().recip():x.gt(c.d25)?c.d250.sub(x).div(c.d300):c.d1.sub(x.div(c.e2)),
		format:{x:(x=prismaticUpgrades.lumenThresholdReduction3.eff())=>c.d1.sub(x).mul(c.e2).format()},
		formula:{x:(x=g.prismaticUpgrades.lumenThresholdReduction3)=>x.gte(c.e2)?"λ":x.gte(c.d25)?"(λ + 50) ÷ 3":"λ"},
		variables:"x",
		baseCost:c.e6,
		scale:c.e2
	},
	prismRune:{
		name:"Prism Rune",
		desc:"Luck shard gain is multiplied by {x} and their first effect is {y}% stronger",
		eff:{
			x:(x=g.prismaticUpgrades.prismRune)=>x.div(c.d7).add(c.d1).pow(c.d7),
			y:(x=g.prismaticUpgrades.prismRune)=>x.gt(142)?x.mul(0.66744718112597245).sub(46.34959730371034).log(7):x.mul(0.007).add(c.d1)
		},
		format:{
			x:(x=prismaticUpgrades.prismRune.eff.x())=>x.noLeadFormat(2),
			y:(x=prismaticUpgrades.prismRune.eff.y())=>x.sub(c.d1).mul(c.e2).noLeadFormat(4)
		},
		formula:{
			x:()=>"(1 + λ ÷ 7)<sup>7</sup>",
			y:()=>g.prismaticUpgrades.prismRune.gt(142)?"100 × log<sub>7</sub>(0.0953496 × λ - 6.621371)":"0.7 × λ"
		},
		variables:"xy",
		baseCost:N(7.77e25),
		scale:c.d7,
		unlockReq:function(){return g.research.r21_7}
	},
	prismLab:{
		name:"Prism Lab",
		desc:"You can buy up to {x} Prismal research",
		eff:(x=g.prismaticUpgrades.prismLab)=>x.mag,
		format:{x:(x=prismaticUpgrades.prismLab.eff())=>x.toString()},
		formula:{x:()=>"λ"},
		variables:"x",
		cost:function(x=g.prismaticUpgrades.prismLab){return Decimal.fromComponents(1,1,Math.floor(27+(88/27)**(x/8))+Math.log10(Math.max(1,x*1.11)))},
		costFormula:()=>"max(1, λ × 1.11) × 10<sup>floor(27 × 1.159151<sup>λ</sup>)</sup>",
		max:c.d9,
		unlockReq:function(){return g.research.r21_8}
	},
	prismCondenser:{
		name:"Prism Condenser",
		desc:"Gain {x} free anti-axis of the first four types",
		eff:(x=g.prismaticUpgrades.prismCondenser)=>Decimal.linearSoftcap(x,c.d99,c.d8,true),
		format:{x:(x=prismaticUpgrades.prismCondenser.eff())=>x.noLeadFormat(4)},
		formula:{x:()=>g.prismaticUpgrades.prismCondenser.gte(c.d99)?"(λ ÷ 11 - 8)<sup>1 ÷ 9</sup> × 99":"λ"},
		variables:"x",
		baseCost:c.e30,
		scale:c.d9,
		unlockReq:function(){return g.research.r21_9}
	}
}
const prismaticUpgradeList = Object.keys(prismaticUpgrades)
const nonRefundablePrismaticUpgrades = prismaticUpgradeList.filter(upg=>!prismaticUpgrades[upg].refundable)
const refundablePrismaticUpgrades = prismaticUpgradeList.filter(upg=>prismaticUpgrades[upg].refundable)
for (let upg of prismaticUpgradeList) prismaticUpgrades[upg].variables = prismaticUpgrades[upg].variables.split("")