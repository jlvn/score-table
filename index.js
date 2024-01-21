/** @typedef {{ value: string, belongsToHighest?: boolean, belongsToLowest?: boolean }} CellData */

/** @typedef {{ bodyRows: CellData[][], footerRow: CellData[], headerRow: CellData[] }} TableData */

/** @typedef {{ name: string, roundScores: RoundScoresData }} PlayerData */

/** @typedef {Record<number, number>} RoundScoresData */

/** @typedef {{ players: PlayerData[], roundCount: number }} GameData */

/** @typedef {{ hasHighestTotalScore: boolean, hasLowestTotalScore: boolean }} HighestLowestTotalScoreCalculationResult */

const numberArrayUtils = {
    /**
     * @param {number[]} values
     * @param {number} initialExtremeValue
     * @param {function(extremeValue: number, value: number): boolean} isExtremeValue
     * @return {number[]}
     */
    itemIndexesWithExtremeValues: (values, initialExtremeValue,  isExtremeValue) => {
        let currentExtremeValue = initialExtremeValue;
        /**
         * @type {number[]}
         */
        let indexesWithExtremeValue = []
        for (let i = 0; i < values.length; i++) {
            const value = values[i]

            if (isExtremeValue(currentExtremeValue, value)) {
                currentExtremeValue = value
                indexesWithExtremeValue = []
            }

            if (currentExtremeValue === value) {
                indexesWithExtremeValue.push(i)
            }
        }

        return indexesWithExtremeValue
    }
}

const gameStorage = {
    /**
     * @throws {Error}
     * @return {GameData}
     */
    tryLoad: () => {
        const item = window.localStorage.getItem('gameData')
        if (!item) {
            throw new Error()
        }

        const maybeGame = JSON.parse(item)
        if (!maybeGame.players || !Array.isArray(maybeGame.players) || maybeGame.players.length < 1 || typeof maybeGame.roundCount !== typeof 1) {
            throw new Error()
        }

        for (const maybePlayer of maybeGame.players) {
            if (!maybePlayer.name ||
                typeof maybePlayer.name !== typeof '' ||
                !maybePlayer.roundScores ||
                typeof maybePlayer.roundScores !== typeof {}
            ) {
                throw new Error()
            }

            /** @type {number[]} */
            const newRoundScores = []

            const entries = Object.entries(maybePlayer.roundScores)

            for (const [indexString, maybeScore] of entries) {
                const maybeIndex = parseInt(indexString)
                if (isNaN(maybeIndex) || isNaN(maybeScore)) {
                    throw new Error()
                }
                newRoundScores[maybeIndex] = maybeScore
            }

            maybePlayer.roundScores = newRoundScores
        }
        return maybeGame
    },

    /**
     * @param {GameData} gameData
     */
    save: (gameData) => {
        window.localStorage.setItem('gameData', JSON.stringify(gameData))
    }
}

/**
 * @param {Game} game
 * @return {GameData}
 */
const convertGameToGameData = (game) => {
    return { players: game.players.map(({ name, roundScores }) => ({roundScores: convertRoundScoresToRoundScoresData(roundScores), name })), roundCount: game.roundCount }
}

/**
 * @param {GameData} gameData
 * @return {Game}
 */
const convertGameDataToGame = (gameData) => {
    const players = gameData.players.map(({name, roundScores}) => new Player(name, convertRoundScoresDataToRoundScores(roundScores)))
    const playerCount = players.length
    const roundCount = gameData.roundCount
    return new Game(roundCount, playerCount, players)
}

/**
 * @param {RoundScoresData} roundScoresData
 */
const convertRoundScoresDataToRoundScores = (roundScoresData) => Object.entries(roundScoresData).reduce((previous, current) => {
    const [
        indexString,
        score
    ] = current
    const index = parseInt(indexString)
    previous[index] = score
    return previous
}, [])

/**
 * @param {number[]} roundScores
 * @return {RoundScoresData}
 */
const convertRoundScoresToRoundScoresData = (roundScores) => roundScores.reduce((previous, current, index) => {
    previous[index] = current
    return previous
}, {})

class Player {
    /** @type {string} */
    name
    /** @type {number[]} */
    roundScores

    /**
     * @param {string} name
     * @param {number[]} roundScores
     */
    constructor(name, roundScores = []) {
        this.name = name
        this.roundScores = roundScores
    }

    clearRoundScores() {
        this.roundScores = []
    }

    /**
     * @return {number|undefined}
     */
    get totalScore() {
        return this.roundScores.reduce(
            (previous, current) =>
                previous === undefined ?
                    (current ?? 0) :
                    previous + (current ?? 0), undefined
        )
    }
}

class Game {
    /** @type {Player[]} */
    #players

    /** @type {number} */
    #roundCount

    /** @type {number} */
    #playerCount

    /**
     * @param {number} roundCount
     * @param {number} playerCount
     * @param {Player[] | undefined} players
     */
    constructor(roundCount, playerCount, players = []) {
        this.#roundCount = roundCount
        this.#playerCount = playerCount
        this.#players = this.#modifyPlayers(playerCount, roundCount, players)
    }

    get players() {
        return this.#players
    }

    get roundCount() {
        return this.#roundCount
    }

    get playerCount() {
        return this.#playerCount
    }

    /**
     * @param {number} newRoundCount
     * @return
     */
    set roundCount(newRoundCount) {
        this.#roundCount = newRoundCount
        this.#players = this.#modifyPlayers(this.#playerCount, this.#roundCount, this.#players)
    }

    /**
     * @param {number} newPlayerCount
     */
    set playerCount(newPlayerCount) {
        this.#playerCount = newPlayerCount
        this.#players = this.#modifyPlayers(this.#playerCount, this.#roundCount, this.#players)
    }

    /**
     * @return {void}
     */
    clearPlayerScores() {
        for (const player of this.#players) {
            player.clearRoundScores()
        }
    }

    /**
     * @param {number} roundCount
     * @param {number} playerCount
     * @param {Player[]} players
     * @return {Player[]}
     */
    #modifyPlayers(playerCount, roundCount, players = []) {
        for (let i = 0; i < playerCount; i++) {
            if (!players[i]) {
                players[i] = new Player(`player ${i + 1}`)
            }
            if (roundCount < players[i].roundScores.length) {
                players[i].roundScores.splice(roundCount - players[i].roundScores.length)
            }
        }
        if (playerCount < players.length) {
            players.splice(playerCount - players.length)
        }
        return players
    }

    /**
     *
     * @return {HighestLowestTotalScoreCalculationResult[]}
     */
    calculateHighestAndLowestPlayerTotalScores() {
        const totalScores = this.#players.map(player => player.totalScore)

        const totalScoresNotUndefinedCount = totalScores.reduce((previous, current) => {
            if (current !== undefined) {
                previous++
            }

            return previous
        }, 0)

        const lowestScoreIndexes = numberArrayUtils.itemIndexesWithExtremeValues(
            totalScores,
            Number.MAX_SAFE_INTEGER,
            (lowestValue, value) => lowestValue > value
        )
        const highestScoreIndexes = numberArrayUtils.itemIndexesWithExtremeValues(
            totalScores,
            Number.MIN_SAFE_INTEGER,
            (highestValue, value) => highestValue < value
        )

        /** @type {HighestLowestTotalScoreCalculationResult[]} */
        const result = this.#players.map(() => ({ hasHighestTotalScore: false, hasLowestTotalScore: false }))

        if (
            highestScoreIndexes.length === this.#players.length
            || lowestScoreIndexes.length === this.#players.length
            || highestScoreIndexes.length === totalScoresNotUndefinedCount
            || lowestScoreIndexes.length === totalScoresNotUndefinedCount
        ) {
            return result
        }

        for (const highestScoreIndex of highestScoreIndexes) {
            result[highestScoreIndex].hasHighestTotalScore = true
        }

        for (const lowestScoreIndex of lowestScoreIndexes) {
            result[lowestScoreIndex].hasLowestTotalScore = true
        }

        return result
    }
}

/**
 * @param {Game} game
 * @return {TableData}
 */
const convertGameToTableData = (game) => {
    const result = game.calculateHighestAndLowestPlayerTotalScores()

    /** @type {CellData[]} */
    const footerRow = [{ value: 'Total', belongsToHighest: false, belongsToLowest: false}]
    footerRow.push(...game.players.map((player, index) => ({
        value: player.totalScore?.toString(),
        belongsToLowest: result[index].hasLowestTotalScore,
        belongsToHighest: result[index].hasHighestTotalScore
    })))

    /** @type {CellData[]} */
    const headerRow = [{value: 'Player', belongsToHighest: false, belongsToLowest: false}]

    /** @type {CellData[][]} */
    const bodyRows = []
    for (let i = 0; i < game.playerCount; i++) {
        headerRow.push({
            value: game.players[i].name,
            belongsToLowest: result[i].hasLowestTotalScore,
            belongsToHighest: result[i].hasHighestTotalScore
        })
        for (let j = 0; j < game.roundCount; j++) {
            if (!bodyRows[j]) {
                bodyRows[j] = [{value: `R ${j + 1}`, belongsToHighest: false, belongsToLowest: false}]
            }
            bodyRows[j][i + 1] = {
                value: game.players[i].roundScores[j] === undefined ? '' : game.players[i].roundScores[j].toString()
            }
        }
    }

    return {
        headerRow,
        bodyRows,
        footerRow
    }
}

/**
 * @param {CellData[]} footerRowData
 * @param {HTMLTableSectionElement} tableFooterElement
 */
const renderTableFooterWithFooterRowData = (tableFooterElement, footerRowData) => {
    tableFooterElement.innerHTML = ''

    const totalsRow = tableFooterElement.insertRow()
    for (let i = 0; i < footerRowData.length; i++) {
        const cell = totalsRow.insertCell(i)
        cell.innerHTML = footerRowData[i].value ?? '<i>empty</i>'
        if (footerRowData[i].belongsToHighest) {
            cell.classList.add('highest')
        }
        if (footerRowData[i].belongsToLowest) {
            cell.classList.add('lowest')
        }
    }
}

/**
 * @param {CellData[][]} bodyRowsData
 * @param {HTMLTableSectionElement} tableBodyElement
 */
const renderTableBodyWithBodyRowsData = (tableBodyElement, bodyRowsData) => {
    tableBodyElement.innerHTML = ''

    for (let i = 0; i < bodyRowsData.length; i++) {
        const row = tableBodyElement.insertRow(i)
        for (let j = 0; j < bodyRowsData[i].length; j++) {
            const cell = row.insertCell(j)
            cell.innerText = bodyRowsData[i][j].value

            if (j > 0) {
                cell.inputMode = 'numeric'
                cell.pattern = '[0-9-]*'
                cell.contentEditable = 'true'
                cell.oninput = (e) => {
                    const score = parseInt(e.target.innerText)

                    if (isNaN(score)) {
                        delete game.players[j - 1].roundScores[i]
                    } else {
                        game.players[j - 1].roundScores[i] = score
                    }

                    gameStorage.save(convertGameToGameData(game))
                    const {
                        headerRow,
                        footerRow
                    } = convertGameToTableData(game)
                    renderTableHeaderWithHeaderRowData(scoresTableHeader, headerRow)
                    renderTableFooterWithFooterRowData(scoresTableFooter, footerRow)
                }
                cell.onkeydown = (e) => {
                    if (
                        e.shiftKey
                        || e.ctrlKey
                        || e.metaKey
                        || e.altKey
                        || e.key === 'Tab'
                        || e.key === 'Insert'
                        || e.key === 'Delete'
                        || e.key === 'Home'
                        || e.key === 'End'
                        || e.key === 'PageUp'
                        || e.key === 'PageDown'
                        || e.key === 'Backspace'
                        || e.key === 'ArrowLeft'
                        || e.key === 'ArrowRight'
                        || e.key === 'ArrowUp'
                        || e.key === 'ArrowDown'
                        || e.key === 'Control'
                    ) {
                        return
                    }

                    if (!e.key.match(/^[0-9-]$/)) {
                        e.preventDefault()
                    }
                }
            }
        }
    }
}

/**
 * @param {HTMLTableSectionElement} tableHeaderElement
 * @param {CellData[]} headerRowData
 */
const renderTableHeaderWithHeaderRowData = (tableHeaderElement, headerRowData) => {
    tableHeaderElement.innerHTML = ''

    const headerRow = tableHeaderElement.insertRow()
    for (let i = 0; i < headerRowData.length; i++) {
        const cell = headerRow.insertCell(i)
        cell.innerText = headerRowData[i].value

        if (headerRowData[i].belongsToHighest) {
            cell.classList.add('highest')
        }

        if (headerRowData[i].belongsToLowest) {
            cell.classList.add('lowest')
        }

        if (i > 0) {
            cell.inputMode = 'email'
            cell.pattern = '\w'
            cell.contentEditable = 'true'
            cell.oninput = (e) => {
                game.players[i - 1].name = e.target.innerText
                gameStorage.save(convertGameToGameData(game))
            }
            cell.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                }
            }
        }
    }
}

/**
 * @param {HTMLTableSectionElement} tableHeaderElement
 * @param {HTMLTableSectionElement} tableBodyElement
 * @param {HTMLTableSectionElement} tableFooterElement
 * @param {TableData} tableData
 */
const renderTableWithTableData = (tableHeaderElement, tableBodyElement, tableFooterElement, tableData) => {
    const {
        headerRow,
        bodyRows,
        footerRow
    } = tableData
    renderTableHeaderWithHeaderRowData(tableHeaderElement, headerRow)
    renderTableBodyWithBodyRowsData(tableBodyElement, bodyRows)
    renderTableFooterWithFooterRowData(tableFooterElement, footerRow)
}

const defaultPlayerCount = 4
const defaultRoundCount = 7

let game = new Game(defaultRoundCount, defaultPlayerCount)
try {
    const gameData = gameStorage.tryLoad()
    game = convertGameDataToGame(gameData)
} catch {
    // ignored
}

/** @type {HTMLTableElement} */
const scoresTable = document.getElementById('scores')
const clearScoresButton = document.getElementById('clearScores')
const roundCountInput = document.getElementById('roundCount')
const playerCountInput = document.getElementById('playerCount')

const scoresTableHeader = scoresTable.createTHead()
const scoresTableBody = scoresTable.createTBody()
const scoresTableFooter = scoresTable.createTFoot()

roundCountInput.value = game.roundCount
playerCountInput.value = game.playerCount

const render = () => renderTableWithTableData(scoresTableHeader, scoresTableBody, scoresTableFooter, convertGameToTableData(game))

/**
 * @param {HTMLTableSectionElement} tableSectionElement
 * @return {void}
 */
const focusFirstScoreCell = (tableSectionElement) => {
    tableSectionElement?.rows[0]?.cells[1]?.focus()
}

roundCountInput.onchange = (e) => {
    game.roundCount = parseInt(e.target.value)
    gameStorage.save(convertGameToGameData(game))
    render()
}

playerCountInput.onchange = (e) => {
    game.playerCount = parseInt(e.target.value)
    gameStorage.save(convertGameToGameData(game))
    render()
}

render()

clearScoresButton.onclick = () => {
    game.clearPlayerScores()
    gameStorage.save(convertGameToGameData(game))
    render()
    focusFirstScoreCell(scoresTableBody)
}
