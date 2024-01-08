/** @typedef {{ bodyRows: string[][], footerRow: string[], headerRow: string[] }} TableData */

/** @typedef {{ name: string, roundScores: (number | undefined)[] }} PlayerData */

/** @typedef {{ players: PlayerData[] }} GameData */

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
        if (!maybeGame.players || !Array.isArray(maybeGame.players) || maybeGame.players.length < 1) {
            throw new Error()
        }

        for (const maybePlayer of maybeGame.players) {
            if (!maybePlayer.name ||
                typeof maybePlayer.name !== typeof '' ||
                !maybePlayer.roundScores ||
                !Array.isArray(maybePlayer.roundScores) ||
                maybePlayer.roundScores.length < 1
            ) {
                throw new Error()
            }

            /** @type {(number | undefined)[]} */
            const newRoundScores = []
            for (let roundScore of maybePlayer.roundScores) {
                if (roundScore !== null &&
                    typeof roundScore !== typeof 1
                ) {
                    throw new Error()
                }
                newRoundScores.push(roundScore != null ? roundScore : undefined)
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
    return { players: game.players.map(({ name, roundScores }) => ({roundScores, name })) }
}

/**
 * @param {GameData} gameData
 * @return {Game}
 */
const convertGameDataToGame = (gameData) => {
    const players = gameData.players.map(({name, roundScores}) => new Player(name, roundScores))
    const playerCount = players.length
    const roundCount = players[0].roundScores.length
    return new Game(roundCount, playerCount, players)
}

class Player {
    /** @type {string} */
    name
    /** @type {(number | undefined)[]} */
    roundScores

    /**
     * @param {string} name
     * @param {(number | undefined)[]} roundScores
     */
    constructor(name, roundScores = []) {
        this.name = name
        this.roundScores = roundScores
    }

    clearRoundScores() {
        this.roundScores = this.roundScores.map(() => undefined)
    }

    /**
     * @return {number}
     */
    get totalScore() {
        return this.roundScores.reduce((previous, current) => previous + (current ?? 0), 0)
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
            for (let j = 0; j < roundCount; j++) {
                if (!players[i].roundScores[j]) {
                    players[i].roundScores[j] = undefined;
                }
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
}

/**
 * @param {Game} game
 * @return {TableData}
 */
const convertGameToTableData = (game) => {
    const footerRow = ['Total']
    footerRow.push(...game.players.map(player => player.totalScore.toString()))

    const headerRow = ['Player']
    const bodyRows = []
    for (let i = 0; i < game.players.length; i++) {
        headerRow.push(game.players[i].name)
        for (let j = 0; j < game.players[i].roundScores.length; j++) {
            if (!bodyRows[j]) {
                bodyRows[j] = [`R ${j + 1}`]
            }
            bodyRows[j][i + 1] = game.players[i].roundScores[j] === undefined ? '' : game.players[i].roundScores[j].toString()
        }
    }

    return {
        headerRow,
        bodyRows,
        footerRow
    }
}

/**
 * @param {string[]} footerRowData
 * @param {HTMLTableSectionElement} tableFooterElement
 */
const renderTableFooterWithFooterRowData = (tableFooterElement, footerRowData) => {
    tableFooterElement.innerHTML = ''

    const totalsRow = tableFooterElement.insertRow()
    for (let i = 0; i < footerRowData.length; i++) {
        const cell = totalsRow.insertCell(i)
        cell.innerText = footerRowData[i]
    }
}

/**
 * @param {string[][]} bodyRowsData
 * @param {HTMLTableSectionElement} tableBodyElement
 */
const renderTableBodyWithBodyRowsData = (tableBodyElement, bodyRowsData) => {
    tableBodyElement.innerHTML = ''

    for (let i = 0; i < bodyRowsData.length; i++) {
        const row = tableBodyElement.insertRow(i)
        for (let j = 0; j < bodyRowsData[i].length; j++) {
            const cell = row.insertCell(j)
            cell.innerText = bodyRowsData[i][j]
            if (j > 0) {
                cell.inputMode = 'numeric'
                cell.pattern = '[0-9]*'
                cell.contentEditable = 'true'
                cell.oninput = (e) => {
                    let score = parseInt(e.target.innerText)
                    if (isNaN(score)) {
                        score = 0
                    }
                    game.players[j - 1].roundScores[i] = score
                    gameStorage.save(convertGameToGameData(game))
                    renderTableFooterWithFooterRowData(scoresTableFooter, convertGameToTableData(game).footerRow)
                }
                cell.onkeydown = (e) => {
                    if (!e.key.match(/^[0-9]/g)) {
                        e.preventDefault()
                    }
                }
            }
        }
    }
}

/**
 * @param {HTMLTableSectionElement} tableHeaderElement
 * @param {string[]} headerRowData
 */
const renderTableHeaderWithHeaderRowData = (tableHeaderElement, headerRowData) => {
    tableHeaderElement.innerHTML = ''

    const headerRow = tableHeaderElement.insertRow()
    for (let i = 0; i < headerRowData.length; i++) {
        const cell = headerRow.insertCell(i)
        cell.innerText = headerRowData[i]
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
}
