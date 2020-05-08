/**
 * Note: all here is strictly based on duck typing.
 * We don't exepect the parent rule to explain the type of the contained formula, for example.
 */

import R from 'ramda'
import { ArrondiExplanation } from './mecanisms/arrondi'
import { ParsedRule, ParsedRules } from './types'

type OnOff = 'oui' | 'non'
export function isOnOff(a: string): a is OnOff {
	return a === 'oui' || a === 'non'
}

// Note: to build type-guards, we would need to have a `isNames` guard. That's
// pretty cumbersome, so for now we rely on this.
type WannabeDottedName = string
export function isWannabeDottedName(a: string): a is WannabeDottedName {
	return typeof a === 'string'
}

type ASTNode = { [_: string]: {} | undefined }

type RuleNode<Names extends string> = ASTNode & ParsedRule<Names>

type RuleProp = ASTNode & {
	category: 'ruleProp'
	rulePropType: string
}
export function isRuleProp(node: ASTNode): node is RuleProp {
	return (
		(node as RuleProp).category === 'ruleProp' &&
		typeof (node as RuleProp).rulePropType === 'string'
	)
}

type CondRuleProp = RuleProp & {
	rulePropType: 'cond'
}
export function isCondRuleProp(node: ASTNode): node is CondRuleProp {
	return isRuleProp(node) && (node as CondRuleProp).rulePropType === 'cond'
}

// [XXX] - What about 'rend non applicable'? Unclear what to do in this case, it seems it would create a graph edge in the contrary sense?
type ApplicableSi = CondRuleProp & {
	dottedName: 'applicable si'
	explanation: ASTNode
}
export function isApplicableSi(node: ASTNode): node is ApplicableSi {
	const applicableSi = node as ApplicableSi
	return (
		isCondRuleProp(node) &&
		applicableSi.dottedName === 'applicable si' &&
		applicableSi.explanation !== undefined
	)
}

type NonApplicableSi = CondRuleProp & {
	dottedName: 'non applicable si'
	explanation: ASTNode
}
export function isNonApplicableSi(node: ASTNode): node is NonApplicableSi {
	const nonApplicableSi = node as NonApplicableSi
	return (
		isCondRuleProp(node) &&
		nonApplicableSi.dottedName === 'non applicable si' &&
		nonApplicableSi.explanation !== undefined
	)
}

type Formule<Names extends string> = RuleProp & {
	name: 'formule'
	rulePropType: 'formula'
	explanation: FormuleExplanation<Names>
}
export function isFormule<Names extends string>(
	node: ASTNode
): node is Formule<Names> {
	const formule = node as Formule<Names>
	return (
		isRuleProp(node) &&
		formule.name === 'formule' &&
		formule.rulePropType === 'formula' &&
		isFormuleExplanation<Names>(formule.explanation)
	)
}

type FormuleExplanation<Names extends string> =
	| Value
	| Operation
	| Possibilities
	| Possibilities2
	| Reference<Names>
	| AnyMechanism<Names>
export function isFormuleExplanation<Names extends string>(
	node: ASTNode
): node is FormuleExplanation<Names> {
	return (
		isValue(node) ||
		isOperation(node) ||
		isReference(node) ||
		isPossibilities(node) ||
		isPossibilities2(node) ||
		isAnyMechanism<Names>(node)
	)
}

type Value = ASTNode & {
	nodeValue: number | string | boolean
}
export function isValue(node: ASTNode): node is Value {
	const value = node as Value
	return (
		typeof value.nodeValue === 'string' ||
		typeof value.nodeValue === 'number' ||
		typeof value.nodeValue === 'boolean'
	)
}

type Operation = ASTNode & {
	operationType: 'comparison' | 'calculation'
	explanation: Array<ASTNode>
}
export function isOperation(node: ASTNode): node is Operation {
	return R.includes((node as Operation).operationType, [
		'comparison',
		'calculation'
	])
}

type Possibilities = ASTNode & {
	possibilités: Array<string>
	'choix obligatoire'?: OnOff
	'une possibilité': OnOff
}
export function isPossibilities(node: ASTNode): node is Possibilities {
	const possibilities = node as Possibilities
	return (
		possibilities.possibilités instanceof Array &&
		possibilities.possibilités.every(it => typeof it === 'string') &&
		(possibilities['choix obligatoire'] === undefined ||
			isOnOff(possibilities['choix obligatoire'])) &&
		isOnOff(possibilities['une possibilité'])
	)
}
type Possibilities2 = ASTNode & {
	[index: number]: string // short dotted name
	'choix obligatoire'?: OnOff
	'une possibilité': OnOff
}
export function isPossibilities2(node: ASTNode): node is Possibilities2 {
	const possibilities2 = node as Possibilities2
	return (
		Object.entries(possibilities2).every(
			([k, v]) => isNaN(parseInt(k, 10)) || typeof v === 'string'
		) &&
		(possibilities2['choix obligatoire'] === undefined ||
			isOnOff(possibilities2['choix obligatoire'])) &&
		isOnOff(possibilities2['une possibilité'])
	)
}

type Reference<Names extends string> = ASTNode & {
	category: 'reference'
	name: Names
	partialReference: Names
	dottedName: Names
}
export function isReference<Names extends string>(
	node: ASTNode
): node is Reference<Names> {
	const reference = node as Reference<Names>
	return (
		reference.category === 'reference' &&
		isWannabeDottedName(reference.name) &&
		isWannabeDottedName(reference.partialReference) &&
		isWannabeDottedName(reference.dottedName)
	)
}

type AbstractMechanism = ASTNode & {
	category: 'mecanism'
	name: string
}
export function isAbstractMechanism(node: ASTNode): node is AbstractMechanism {
	return (
		(node as AbstractMechanism).category === 'mecanism' &&
		typeof (node as AbstractMechanism).name === 'string'
	)
}

type RecalculMech<Names extends string> = AbstractMechanism & {
	explanation: {
		recalcul: Reference<Names>
		amendedSituation: Record<Names, Reference<Names>>
	}
}
export function isRecalculMech<Names extends string>(
	node: ASTNode
): node is RecalculMech<Names> {
	const recalculMech = node as RecalculMech<Names>
	const isReferenceSpec = isReference as (
		node: ASTNode
	) => node is Reference<Names>
	return (
		typeof recalculMech.explanation === 'object' &&
		typeof recalculMech.explanation.recalcul === 'object' &&
		isReferenceSpec(recalculMech.explanation.recalcul as ASTNode) &&
		typeof recalculMech.explanation.amendedSituation === 'object'
	)
}

type EncadrementMech = AbstractMechanism & {
	name: 'encadrement'
	explanation: {
		valeur: ASTNode
		plafond: ASTNode
		plancher: ASTNode
	}
}
export function isEncadrementMech(node: ASTNode): node is EncadrementMech {
	const encadrementMech = node as EncadrementMech
	return (
		isAbstractMechanism(encadrementMech) &&
		encadrementMech.name == 'encadrement' &&
		typeof encadrementMech.explanation === 'object' &&
		encadrementMech.explanation.valeur !== undefined &&
		encadrementMech.explanation.plafond !== undefined &&
		encadrementMech.explanation.plancher !== undefined
	)
}

type SommeMech = AbstractMechanism & {
	name: 'somme'
	explanation: Array<ASTNode>
}
export function isSommeMech(node: ASTNode): node is SommeMech {
	const sommeMech = node as SommeMech
	return (
		isAbstractMechanism(sommeMech) &&
		sommeMech.name === 'somme' &&
		sommeMech.explanation instanceof Array
	)
}

type ProduitMech = AbstractMechanism & {
	name: 'produit'
	explanation: {
		assiette: ASTNode
		plafond: ASTNode
		facteur: ASTNode
		taux: ASTNode
	}
}
export function isProduitMech(node: ASTNode): node is ProduitMech {
	const produitMech = node as ProduitMech
	return (
		isAbstractMechanism(produitMech) &&
		produitMech.name === 'produit' &&
		typeof produitMech.explanation === 'object' &&
		typeof produitMech.explanation.assiette === 'object' &&
		typeof produitMech.explanation.plafond === 'object' &&
		typeof produitMech.explanation.facteur === 'object' &&
		typeof produitMech.explanation.taux === 'object'
	)
}

type VariationsMech = AbstractMechanism & {
	name: 'variations'
	explanation: {
		condition: ASTNode
		consequence: ASTNode
	}[]
}
export function isVariationsMech(node: ASTNode): node is VariationsMech {
	const variationsMech = node as VariationsMech
	return (
		isAbstractMechanism(variationsMech) &&
		variationsMech.name === 'variations' &&
		variationsMech.explanation instanceof Array &&
		variationsMech.explanation.every(
			variation =>
				typeof variation === 'object' &&
				variation.condition !== undefined &&
				variation.consequence !== undefined
		)
	)
}

type AllegementMech = AbstractMechanism & {
	name: 'allègement'
	explanation: {
		abattement: ASTNode
		assiette: ASTNode
		décote:
			| undefined
			| {
					plafond: ASTNode
					taux: ASTNode
			  }
		franchise: ASTNode
		plafond: ASTNode
	}
}
export function isAllegementMech(node: ASTNode): node is AllegementMech {
	const allegementMech = node as AllegementMech
	return (
		isAbstractMechanism(allegementMech) &&
		allegementMech.name === 'allègement' &&
		typeof allegementMech.explanation === 'object' &&
		allegementMech.explanation.abattement !== undefined &&
		allegementMech.explanation.assiette !== undefined &&
		allegementMech.explanation.franchise !== undefined &&
		allegementMech.explanation.plafond !== undefined &&
		(allegementMech.explanation.décote === undefined ||
			(typeof allegementMech.explanation.décote === 'object' &&
				allegementMech.explanation.décote.plafond !== undefined &&
				allegementMech.explanation.décote.taux !== undefined))
	)
}

type BaremeMech = AbstractMechanism & {
	name: 'barème'
	explanation: {
		assiette: ASTNode
		multiplicateur: ASTNode
		tranches: {
			plafond: ASTNode
			taux: ASTNode
		}[]
	}
}
export function isBaremeMech(node: ASTNode): node is BaremeMech {
	const baremeMech = node as BaremeMech
	return (
		isAbstractMechanism(baremeMech) &&
		baremeMech.name === 'barème' &&
		typeof baremeMech.explanation === 'object' &&
		baremeMech.explanation.assiette !== undefined &&
		baremeMech.explanation.multiplicateur !== undefined &&
		baremeMech.explanation.tranches instanceof Array &&
		baremeMech.explanation.tranches.every(
			tranche =>
				typeof tranche === 'object' &&
				tranche.plafond !== undefined &&
				tranche.taux !== undefined
		)
	)
}

type InversionNumMech<Names extends string> = AbstractMechanism & {
	name: 'inversion numérique'
	explanation: {
		inversionCandidates: Array<Reference<Names>>
	}
}
export function isInversionNumMech<Names extends string>(
	node: ASTNode
): node is InversionNumMech<Names> {
	const inversionNumMech = node as InversionNumMech<Names>
	const isReferenceSpec = isReference as (
		node: ASTNode
	) => node is Reference<Names>
	return (
		isAbstractMechanism(inversionNumMech) &&
		inversionNumMech.name === 'inversion numérique' &&
		typeof inversionNumMech.explanation === 'object' &&
		inversionNumMech.explanation.inversionCandidates instanceof Array &&
		inversionNumMech.explanation.inversionCandidates.every(isReferenceSpec)
	)
}

type ArrondiMech = AbstractMechanism & {
	name: 'arrondi'
	explanation: Record<keyof ArrondiExplanation, ASTNode>
}
export function isArrondiMech(node: ASTNode): node is ArrondiMech {
	const arrondiMech = node as ArrondiMech
	return (
		isAbstractMechanism(arrondiMech) &&
		arrondiMech.name === 'arrondi' &&
		typeof arrondiMech.explanation === 'object' &&
		arrondiMech.explanation.decimals !== undefined &&
		arrondiMech.explanation.value !== undefined
	)
}

type MaxMech = AbstractMechanism & {
	name: 'le maximum de'
	explanation: Array<ASTNode>
}
export function isMaxMech(node: ASTNode): node is MaxMech {
	const maxMech = node as MaxMech
	return (
		isAbstractMechanism(maxMech) &&
		maxMech.name === 'le maximum de' &&
		maxMech.explanation instanceof Array
	)
}

type MinMech = AbstractMechanism & {
	name: 'le minimum de'
	explanation: Array<ASTNode>
}
export function isMinMech(node: ASTNode): node is MinMech {
	const minMech = node as MinMech
	return (
		isAbstractMechanism(minMech) &&
		minMech.name === 'le minimum de' &&
		minMech.explanation instanceof Array
	)
}

type ComposantesMech = AbstractMechanism & {
	name: 'composantes'
	explanation: Array<ASTNode>
}
export function isComposantesMech(node: ASTNode): node is ComposantesMech {
	const composantesMech = node as ComposantesMech
	return (
		isAbstractMechanism(composantesMech) &&
		composantesMech.name === 'composantes' &&
		composantesMech.explanation instanceof Array
	)
}

type UneConditionsMech = AbstractMechanism & {
	name: 'une de ces conditions'
	explanation: Array<ASTNode>
}
export function isUneConditionsMech(node: ASTNode): node is UneConditionsMech {
	const uneConditionsMech = node as UneConditionsMech
	return (
		isAbstractMechanism(uneConditionsMech) &&
		uneConditionsMech.name === 'une de ces conditions' &&
		uneConditionsMech.explanation instanceof Array
	)
}

type ToutesConditionsMech = AbstractMechanism & {
	name: 'toutes ces conditions'
	explanation: Array<ASTNode>
}
export function isToutesConditionsMech(
	node: ASTNode
): node is ToutesConditionsMech {
	const toutesConditionsMech = node as ToutesConditionsMech
	return (
		isAbstractMechanism(toutesConditionsMech) &&
		toutesConditionsMech.name === 'toutes ces conditions' &&
		toutesConditionsMech.explanation instanceof Array
	)
}

type SyncMech = AbstractMechanism & {
	name: 'synchronisation'
	API: {}
}
export function isSyncMech(node: ASTNode): node is SyncMech {
	const syncMech = node as SyncMech
	return isAbstractMechanism(syncMech) && syncMech.name === 'synchronisation'
}

type GrilleMech = AbstractMechanism & {
	name: 'grille'
	explanation: {
		assiette: ASTNode
		multiplicateur: ASTNode
		tranches: {
			montant: ASTNode
			plafond: ASTNode
		}[]
	}
}
export function isGrilleMech(node: ASTNode): node is GrilleMech {
	const grilleMech = node as GrilleMech
	return (
		isAbstractMechanism(grilleMech) &&
		grilleMech.name === 'grille' &&
		typeof grilleMech.explanation === 'object' &&
		grilleMech.explanation.assiette !== undefined &&
		grilleMech.explanation.multiplicateur !== undefined &&
		grilleMech.explanation.tranches instanceof Array &&
		grilleMech.explanation.tranches.every(
			tranche =>
				typeof tranche === 'object' &&
				tranche.montant !== undefined &&
				tranche.plafond !== undefined
		)
	)
}

type TauxProgMech = AbstractMechanism & {
	name: 'taux progressif'
	explanation: {
		assiette: ASTNode
		multiplicateur: ASTNode
		tranches: {
			plafond: ASTNode
			taux: ASTNode
		}[]
	}
}
export function isTauxProgMech(node: ASTNode): node is TauxProgMech {
	const tauxProgMech = node as TauxProgMech
	return (
		isAbstractMechanism(tauxProgMech) &&
		tauxProgMech.name === 'taux progressif' &&
		typeof tauxProgMech.explanation === 'object' &&
		tauxProgMech.explanation.assiette !== undefined &&
		tauxProgMech.explanation.multiplicateur !== undefined &&
		tauxProgMech.explanation.tranches instanceof Array &&
		tauxProgMech.explanation.tranches.every(
			tranche =>
				typeof tranche === 'object' &&
				tranche.plafond !== undefined &&
				tranche.taux !== undefined
		)
	)
}

type DureeMech = AbstractMechanism & {
	name: 'Durée'
	explanation: {
		depuis: ASTNode
		"jusqu'à": ASTNode
	}
}
export function isDureeMech(node: ASTNode): node is DureeMech {
	const dureeMech = node as DureeMech
	return (
		isAbstractMechanism(dureeMech) &&
		dureeMech.name === 'Durée' &&
		typeof dureeMech.explanation === 'object' &&
		dureeMech.explanation.depuis !== undefined &&
		dureeMech.explanation["jusqu'à"] !== undefined
	)
}

type AnyMechanism<Names extends string> =
	| RecalculMech<Names>
	| EncadrementMech
	| SommeMech
	| ProduitMech
	| VariationsMech
	| AllegementMech
	| BaremeMech
	| InversionNumMech<Names>
	| ArrondiMech
	| MaxMech
	| MinMech
	| ComposantesMech
	| UneConditionsMech
	| ToutesConditionsMech
	| SyncMech
	| GrilleMech
	| TauxProgMech
	| DureeMech
export function isAnyMechanism<Names extends string>(
	node: ASTNode
): node is AnyMechanism<Names> {
	return (
		isRecalculMech<Names>(node) ||
		isEncadrementMech(node) ||
		isSommeMech(node) ||
		isProduitMech(node) ||
		isVariationsMech(node) ||
		isAllegementMech(node) ||
		isBaremeMech(node) ||
		isInversionNumMech<Names>(node) ||
		isArrondiMech(node) ||
		isMaxMech(node) ||
		isMinMech(node) ||
		isComposantesMech(node) ||
		isUneConditionsMech(node) ||
		isToutesConditionsMech(node) ||
		isSyncMech(node) ||
		isGrilleMech(node) ||
		isTauxProgMech(node) ||
		isDureeMech(node)
	)
}

export function ruleDependenciesOfNode<Names extends string>(
	ruleName: Names,
	node: ASTNode
): Array<Names> {
	function ruleDependenciesOfApplicableSi(
		applicableSi: ApplicableSi
	): Array<Names> {
		return ruleDependenciesOfNode(ruleName, applicableSi.explanation)
	}

	function ruleDependenciesOfNonApplicableSi(
		nonApplicableSi: NonApplicableSi
	): Array<Names> {
		return ruleDependenciesOfNode(ruleName, nonApplicableSi.explanation)
	}

	function ruleDependenciesOfFormule(formule: Formule<Names>): Array<Names> {
		return ruleDependenciesOfNode(ruleName, formule.explanation)
	}

	function ruleDependenciesOfValue(value: Value): Array<Names> {
		return []
	}

	function ruleDependenciesOfOperation(operation: Operation): Array<Names> {
		return operation.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
	}

	function ruleDependenciesOfPossibilities(
		possibilities: Possibilities
	): Array<Names> {
		return []
	}
	function ruleDependenciesOfPossibilities2(
		possibilities: Possibilities2
	): Array<Names> {
		return []
	}

	function ruleDependenciesOfReference(
		reference: Reference<Names>
	): Array<Names> {
		return [reference.dottedName]
	}

	function ruleDependenciesOfRecalculMech(
		recalculMech: RecalculMech<Names>
	): Array<Names> {
		return [recalculMech.explanation.recalcul.partialReference]
	}

	function ruleDependenciesOfEncadrementMech(
		encadrementMech: EncadrementMech
	): Array<Names> {
		const result = [
			encadrementMech.explanation.plafond,
			encadrementMech.explanation.plancher,
			encadrementMech.explanation.valeur
		].flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfSommeMech(sommeMech: SommeMech): Array<Names> {
		const result = sommeMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfProduitMech(
		produitMech: ProduitMech
	): Array<Names> {
		const result = [
			produitMech.explanation.assiette,
			produitMech.explanation.plafond,
			produitMech.explanation.facteur,
			produitMech.explanation.taux
		].flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfVariationsMech(
		variationsMech: VariationsMech
	): Array<Names> {
		function ruleOfVariation({
			condition,
			consequence
		}: {
			condition: ASTNode
			consequence: ASTNode
		}): Array<Names> {
			return R.concat(
				ruleDependenciesOfNode<Names>(ruleName, condition),
				ruleDependenciesOfNode<Names>(ruleName, consequence)
			)
		}
		const result = variationsMech.explanation.flatMap(ruleOfVariation)
		return result
	}

	function ruleDependenciesOfAllegementMech(
		allegementMech: AllegementMech
	): Array<Names> {
		const subNodes = R.concat(
			[
				allegementMech.explanation.abattement,
				allegementMech.explanation.assiette,
				allegementMech.explanation.franchise,
				allegementMech.explanation.plafond
			],
			allegementMech.explanation.décote
				? [
						allegementMech.explanation.décote.plafond,
						allegementMech.explanation.décote.taux
				  ]
				: []
		)
		const result = subNodes.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfBaremeMech(baremeMech: BaremeMech): Array<Names> {
		const tranchesNodes = baremeMech.explanation.tranches.flatMap(
			({ plafond, taux }) => [plafond, taux]
		)
		const result = R.concat(
			[baremeMech.explanation.assiette, baremeMech.explanation.multiplicateur],
			tranchesNodes
		).flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	/**
	 * Returns 0 dependency for _inversion numérique_ as it's not creating a logical dependency.
	 */
	function ruleDependenciesOfInversionNumMech(
		inversionNumMech: InversionNumMech<Names>
	): Array<Names> {
		return []
	}

	function ruleDependenciesOfArrondiMech(
		arrondiMech: ArrondiMech
	): Array<Names> {
		const result = [
			arrondiMech.explanation.decimals,
			arrondiMech.explanation.value
		].flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfMaxMech(maxMech: MaxMech): Array<Names> {
		const result = maxMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfMinMech(minMech: MinMech): Array<Names> {
		const result = minMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfComposantesMech(
		composantesMech: ComposantesMech
	): Array<Names> {
		const result = composantesMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfUneConditionsMech(
		uneConditionsMech: UneConditionsMech
	): Array<Names> {
		const result = uneConditionsMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfToutesConditionsMech(
		toutesConditionsMech: ToutesConditionsMech
	): Array<Names> {
		const result = toutesConditionsMech.explanation.flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfSyncMech(_: SyncMech): Array<Names> {
		return []
	}

	function ruleDependenciesOfGrilleMech(grilleMech: GrilleMech): Array<Names> {
		const tranchesNodes = grilleMech.explanation.tranches.flatMap(
			({ montant, plafond }) => [montant, plafond]
		)
		const result = R.concat(
			[grilleMech.explanation.assiette, grilleMech.explanation.multiplicateur],
			tranchesNodes
		).flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfTauxProgMech(
		tauxProgMech: TauxProgMech
	): Array<Names> {
		const tranchesNodes = tauxProgMech.explanation.tranches.flatMap(
			({ plafond, taux }) => [plafond, taux]
		)
		const result = R.concat(
			[
				tauxProgMech.explanation.assiette,
				tauxProgMech.explanation.multiplicateur
			],
			tranchesNodes
		).flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	function ruleDependenciesOfDureeMech(dureeMech: DureeMech): Array<Names> {
		const result = [
			dureeMech.explanation.depuis,
			dureeMech.explanation["jusqu'à"]
		].flatMap(
			R.partial<Names, ASTNode, Array<Names>>(ruleDependenciesOfNode, [
				ruleName
			])
		)
		return result
	}

	if (isApplicableSi(node)) {
		return ruleDependenciesOfApplicableSi(node)
	} else if (isNonApplicableSi(node)) {
		return ruleDependenciesOfNonApplicableSi(node)
	} else if (isFormule<Names>(node)) {
		return ruleDependenciesOfFormule(node)
	} else if (isValue(node)) {
		return ruleDependenciesOfValue(node)
	} else if (isOperation(node)) {
		return ruleDependenciesOfOperation(node)
	} else if (isReference<Names>(node)) {
		return ruleDependenciesOfReference(node)
	} else if (isPossibilities(node)) {
		return ruleDependenciesOfPossibilities(node)
	} else if (isPossibilities2(node)) {
		return ruleDependenciesOfPossibilities2(node)
	} else if (isRecalculMech<Names>(node)) {
		return ruleDependenciesOfRecalculMech(node)
	} else if (isEncadrementMech(node)) {
		return ruleDependenciesOfEncadrementMech(node)
	} else if (isSommeMech(node)) {
		return ruleDependenciesOfSommeMech(node)
	} else if (isProduitMech(node)) {
		return ruleDependenciesOfProduitMech(node)
	} else if (isVariationsMech(node)) {
		return ruleDependenciesOfVariationsMech(node)
	} else if (isAllegementMech(node)) {
		return ruleDependenciesOfAllegementMech(node)
	} else if (isBaremeMech(node)) {
		return ruleDependenciesOfBaremeMech(node)
	} else if (isInversionNumMech<Names>(node)) {
		return ruleDependenciesOfInversionNumMech(node)
	} else if (isArrondiMech(node)) {
		return ruleDependenciesOfArrondiMech(node)
	} else if (isMaxMech(node)) {
		return ruleDependenciesOfMaxMech(node)
	} else if (isMinMech(node)) {
		return ruleDependenciesOfMinMech(node)
	} else if (isComposantesMech(node)) {
		return ruleDependenciesOfComposantesMech(node)
	} else if (isUneConditionsMech(node)) {
		return ruleDependenciesOfUneConditionsMech(node)
	} else if (isToutesConditionsMech(node)) {
		return ruleDependenciesOfToutesConditionsMech(node)
	} else if (isSyncMech(node)) {
		return ruleDependenciesOfSyncMech(node)
	} else if (isGrilleMech(node)) {
		return ruleDependenciesOfGrilleMech(node)
	} else if (isTauxProgMech(node)) {
		return ruleDependenciesOfTauxProgMech(node)
	} else if (isDureeMech(node)) {
		return ruleDependenciesOfDureeMech(node)
	}

	throw new Error(
		`This node doesn't have a visitor method defined: ${JSON.stringify(
			node,
			null,
			4
		)}`
	)
}

function ruleDependenciesOfRuleNode<Names extends string>(
	rule: RuleNode<Names>
): Array<Names> {
	const subNodes = [
		rule.formule,
		rule['applicable si'],
		rule['non applicable si']
	].filter(x => x !== undefined) as Array<ASTNode>
	const dependenciesLists = subNodes.map(x =>
		ruleDependenciesOfNode<Names>(rule.dottedName, x)
	)
	return dependenciesLists.flat(1)
}

export function buildRulesDependencies<Names extends string>(
	parsedRules: ParsedRules<Names>
): Array<[Names, Array<Names>]> {
	// This stringPairs thing is necessary because `toPairs` is strictly considering that
	// object keys are strings (same for `Object.entries`). Maybe we should build our own
	// `toPairs`?
	const stringPairs: Array<[string, RuleNode<Names>]> = Object.entries(
		parsedRules
	)
	const pairs: Array<[Names, RuleNode<Names>]> = stringPairs as Array<
		[Names, RuleNode<Names>]
	>

	return pairs.map(([dottedName, ruleNode]: [Names, RuleNode<Names>]): [
		Names,
		Array<Names>
	] => [dottedName, ruleDependenciesOfRuleNode<Names>(ruleNode)])
}
