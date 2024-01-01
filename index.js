/** @typedef {{ bodyRows: string[][], footerRow: string[], headerRow: string[] }} TableData */

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
        this.roundScores = this.roundScores.map(roundScore => undefined)
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
                bodyRows[j] = [`Round ${j + 1}`]
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
                cell.contentEditable = 'true'
                cell.oninput = (e) => {
                    let score = parseInt(e.target.innerText)
                    if (isNaN(score)) {
                        score = 0
                    }
                    game.players[j - 1].roundScores[i] = score
                    renderTableFooterWithFooterRowData(scoresTableFooter, convertGameToTableData(game).footerRow)
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
            cell.contentEditable = 'true'
            cell.oninput = (e) => {
                game.players[i - 1].name = e.target.innerText
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

const game = new Game(defaultRoundCount, defaultPlayerCount)

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
    render()
}

playerCountInput.onchange = (e) => {
    game.playerCount = parseInt(e.target.value)
    render()
}

render()

clearScoresButton.onclick = () => {
    game.clearPlayerScores()
    render()
}