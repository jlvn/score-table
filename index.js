/** @typedef {{name: string, roundScores: (number | undefined)[] }} Player */

/** @typedef {{ bodyRows: string[][], footerRow: string[], headerRow: string[] }} TableData */

/**
 * @param {number} roundCount
 * @param {number} playerCount
 * @param {Player[]} players
 * @param {string[]} names
 * @return {Player[]}
 */
const modifyPlayers = (playerCount, roundCount, players = [], names = []) => {
    for (let i = 0; i < playerCount; i++) {
        if (!players[i]) {
            players[i] = {name: names[i] ? names[i] : `player ${i + 1}`, roundScores: []}
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

/**
 * @param {Player[]} players
 * @return {number[]}
 */
const calculateRoundScoreTotals = (players) => {
    return players.reduce((totals, player) => {
        totals.push(calculateTotalRoundScoreFor(player))
        return totals
    }, [])
}

/**
 * @param {Player} player
 * @return {number}
 */
const calculateTotalRoundScoreFor = (player) =>
    player.roundScores.reduce((previous, current) => previous + (current ?? 0), 0)

/**
 * @param {Player[]} players
 * @param {function(Player[]): number[]} calculateTotals
 * @return {TableData}
 */
const convertPlayersToTableData = (players, calculateTotals) => {
    const footerRow = ['Total']
    footerRow.push(...calculateTotals(players).map(total => total.toString()))

    const headerRow = ['Player']
    const bodyRows = []
    for (let i = 0; i < players.length; i++) {
        headerRow.push(players[i].name)
        for (let j = 0; j < players[i].roundScores.length; j++) {
            if (!bodyRows[j]) {
                bodyRows[j] = [`Round ${j + 1}`]
            }
            bodyRows[j][i + 1] = players[i].roundScores[j] === undefined ? '' : players[i].roundScores[j].toString()
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
                    players[j - 1].roundScores[i] = score
                    renderTableFooterWithFooterRowData(scoresTableFooter, convertPlayersToTableData(players, calculateRoundScoreTotals).footerRow)
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
                players[i - 1].name = e.target.innerText
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
let playerCount = defaultPlayerCount
let roundCount = defaultRoundCount
/** @type {Player[]} */
let players = []

/** @type {HTMLTableElement} */
const scoresTable = document.getElementById('scores')
const resetButton = document.getElementById('reset')
const roundCountInput = document.getElementById('roundCount')
const playerCountInput = document.getElementById('playerCount')

const scoresTableHeader = scoresTable.createTHead()
const scoresTableBody = scoresTable.createTBody()
const scoresTableFooter = scoresTable.createTFoot()

const resize = () => {
    players = modifyPlayers(playerCount, roundCount, players)
    renderTableWithTableData(scoresTableHeader, scoresTableBody, scoresTableFooter, convertPlayersToTableData(players, calculateRoundScoreTotals))
}

roundCountInput.onchange = (e) => {
    roundCount = parseInt(e.target.value)
    resize()
}

playerCountInput.onchange = (e) => {
    playerCount = parseInt(e.target.value)
    resize()
}

const reset = () => {
    roundCountInput.value = defaultRoundCount
    playerCountInput.value = defaultPlayerCount
    players = modifyPlayers(defaultPlayerCount, defaultRoundCount, [], players.map(player => player.name))
    renderTableWithTableData(scoresTableHeader, scoresTableBody, scoresTableFooter, convertPlayersToTableData(players, calculateRoundScoreTotals))
}

reset()

resetButton.onclick = reset