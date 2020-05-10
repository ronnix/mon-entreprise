# Api

Publicode est distribué sous la forme d'une librairie Node.js permettant de
compiler une source publicode et de l'évaluer dans une situation donnée.

## Installation

> npm install publicodes

## Utilisation

### Introduction

La libraire exporte un objet `Engine` qui permet d'instancier le moteur avec un
jeu de règles publicodes :

```js
import Engine from 'publicodes'

// On définit une liste de règles publicodes
const rules = `
prix . carottes: 2€/kg
prix . champignons: 5€/kg
prix . avocat: 2€/avocat

dépenses primeur:
  formule: 
    somme:
      - prix . carottes * 1.5 kg
      - prix . champignons * 500g
      - prix . avocat * 3 avocat
`

// On initialise un moteur en lui donnant le publicode.
// Ce publicode va être parsé
const engine = new Engine(rules)
```

La variable `engine` permet en ensuite de calculer la valeur d'une règle avec la
fonction évaluate.

```js
console.log(engine.evaluate('dépenses primeur'))
```

La valeur numérique du nœud est disponible dans l'attribut `nodeValue`, son
unité est disponible dans l'attribut `unit` :

```js
const { nodeValue, unit } = engine.evaluate('dépenses primeur')
console.log(`j'ai dépensé ${nodeValue} ${unit} chez le primeur`)
```

La méthode `setSituation` permet de forcer la valeur d'une liste de règle. Elle
utile pour pour présier les paramètres spécifiques à une simulation.

```js
// Ici on change le prix des avocats
engine.setSituation({
	'prix . avocat': '3€/avocat'
})
```

La valeur de `dépenses primeur` se base maintenant sur un avocat à 3€ :

```js
// On ré-évalue la règle dans la nouvelle situation
console.log(`Nouveau prix ! ${engine.evaluate('dépenses primeur').nodeValue}`)
```

### Évaluation d'expressions

La fonction `evaluate` permet d'évaluer des expressions publicode complère

# TODO exemple

### Conversion d'unité

### Variables manquantes

Publicode calcule automatiquement les dépendances de chaque règle. Si une la
valeur d'une dépendance est manquante et ne permet pas de faire le calcul, la
règle manquante apparaîtra dans l'attribut `missingVariables`

```js
const engine = new Engine(`
x: y + 5

y:
`)

console.log(engine.evaluate('x').missingVariables)
```

Cette information est utile pour intégrer publicode à votre application.

Il est aussi possible d'utiliser des valeurs par défaut. Dans ce cas la règle
sera calculée avec la valeur par défaut de sa dépendance, mais cette dernière
apparaîtra tout de même dans le `missingVariables`. Cette fonctionnalité est
utile pour réaliser des simulateurs où l'on veut proposer un résultat sans
attendre que l'utilisateur n'ai répondu à l'intégralité des questions tout en
utilisant la liste des variables manquantes pour déterminer les questions
restants à poser.

# TODO : Exemple

Les variables manquantes sont calculées lors de l'évaluation. Si une variable
apparaît dans la formule de calcul d'une règle elle ne sera rapportée que si
elle est effectivement nécessaire au calcul. Si elle est présente dans une
portion non active de l'évaluation (par exemple dans un bloc condition non
actif, ou la tranche d'un barème non actif) elle sera filtrée et n'apparaîtra
pas dans les `missingVariables`

# TODO : Exemple
