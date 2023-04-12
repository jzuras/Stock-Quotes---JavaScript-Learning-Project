import { getStockQuote, isApikeyValid } from './modules/getStockQuote.js';
import { getTimeSeries, setApikey as setTimeSeriesApikey } from './modules/getTimeSeriesQuote.js';
import { drawChart } from './modules/stockChart.js'

// HTML elements:
const divApikey = document.querySelector( '#divApikey' );
const inputApikey = document.querySelector( '#inputApikey' );
const btnApikey = document.querySelector( '#btnApikey' );
const divStockSymbol = document.querySelector( '#divStockSymbol' );
const inputStockSymbol = document.querySelector( '#inputStockSymbol' );
const btnGetQuote = document.querySelector( '#btnGetQuote' );
const tblQuotes = document.querySelector( 'table' );
const tbodyQuotes = document.querySelector( '#tbodyQuotes' );
const form = document.querySelector( 'form' );
const divChart = document.querySelector( '#divChart' );
const canvasChart = document.getElementById( 'stockChart' );
const lblCurrentChartSymbol = document.querySelector( '#lblCurrentChartSymbol' );

// hard-coded constants
const refreshButtonText = 'Refresh 3 times';
const refreshButtonID = 'refreshButton';
const refreshInterval = 30000; // 8 calls per minute MAX!
const refreshMaxTimes = 3;
const symbolColumnIndex = 0;
const quoteColumnIndex = 2; // time of quote column is this + 1

// non constant variables:
// key is company symbol, value is object: {refreshCounter, intervalID}
let intervalMap = new Map(); 

// used to determine if chart should be hidden
// ( when company being shown is deleted from table)
let symbolInChart = ''; 

// pulled from user input - this is a kludge to avoid exposing via GitHub
let apikeyFromUser = 'demo';

// todo - convert entire project to TypeScript

// todo - convert above querySelector calls to use IDs instead
// (waiting for TypeScript conversion to complete this.)

// todo - check/change JSDoc comments after move to TypeScript

// todo - test after market hours and on weekend

// Initialization code:

// Stop the form from submitting when a button is pressed
form.addEventListener( 'submit', ( e ) => e.preventDefault() );

btnApikey.addEventListener( 'click', apikeyButtonClick );
btnGetQuote.addEventListener( 'click', getQuoteButtonClick );

// set chart dimensions
canvasChart.width = window.innerWidth - 50;
canvasChart.height = 500;


// functions:

/**
 * Checks for correct Apikey in the text box by asking single quote module.
 * If valid, hides HTML elements for apikey input and un-hides for quote input.
 */
function apikeyButtonClick() 
{
  apikeyFromUser = inputApikey.value;

  if ( !apikeyFromUser ) return;

  const isValidPromise =
    isApikeyValid( apikeyFromUser );
  isValidPromise
    .then( ( isValid ) => handleValidity( isValid ) )
    .catch( ( error ) =>
    {
      window.alert( error );
    } )
}

/**
 * For invalid key, reset HTML elements and allow user to try again.
 * For valid key, disable these elements and un-hide ones for quote.
 * Also sets apikey for TimeSeries module.
 * @param {boolean} isValid  true for valid apikey, false otherwise
 * @returns void
 */
function handleValidity( isValid )
{
  if ( !isValid )
  {
    // apikey not valid, clear text box and reset focus there
    inputApikey.value = '';
    inputApikey.focus();

    window.alert( 'Invalid Apikey, please try agagin.' );
    return;
  }

  // apikey is valid, so allow user to enter ticker symbol

  // remove 'submit' from button type so quote button works with Enter key
  btnApikey.type = 'button';

  // disable apikey input controls
  btnApikey.disabled = true;;
  inputApikey.disabled = true;;

  // let TimeSeries module know the valid apikey, but no need to do same
  // for SingleQuote module, since it was the module that validated the key.
  setTimeSeriesApikey( apikeyFromUser );

  // un-hide stock quote elements and set focus there
  divStockSymbol.style.display = 'block';
  inputStockSymbol.focus();
};

/**
 * Attempts to get a current price quote for the symbol in the text box,
 * adding it to the HTML table of quotes.
 * Also clears out the text box and gives it focus.
 */
function getQuoteButtonClick() 
{
  const stockSymbol = inputStockSymbol.value;
  inputStockSymbol.value = '';
    
  if ( !stockSymbol )
  {
    inputStockSymbol.focus();
    return;
  }
  
  const companyStockDataPromise =
    getStockQuote( stockSymbol );
  companyStockDataPromise
    .then( ( data ) => addRow( data ) )
    .catch( ( error ) =>
    {
      window.alert( error );
    } )
  
  inputStockSymbol.focus();
};

/**
 * Dynamically adds a row to the given HTML Table using the StockData data.
 * Row will also include buttons to show in chart, start a timer (which only
 * ruefreshes a few times to save API calls), or to delete the row from the table.
 * @param {*} data - a StockData object used to populate the row.
 */
function addRow( data ) 
{
  // todo - change loop to be data-structure specific (waiting for TypeScript)
  let row = tbodyQuotes.insertRow();
  let cell;
  for ( let key in data )
  {
    cell = row.insertCell();
    let text = document.createTextNode( data[key] );
    cell.appendChild( text );
  }

  // add button to show this company in chart
  const showInChartBtn = document.createElement( 'button' );
  showInChartBtn.textContent = 'Chart';
  cell = row.insertCell();
  cell.appendChild( showInChartBtn );
  showInChartBtn.addEventListener( 'click', () =>
  {
    showInChartButtonClick( row );
  } );

  // add button to refresh quote (only a few times
  // so as not to use too many API calls)
  const refreshBtn = document.createElement( 'button' );
  refreshBtn.textContent = refreshButtonText;
  refreshBtn.id = refreshButtonID;
  cell = row.insertCell();
  cell.appendChild( refreshBtn );
  refreshBtn.addEventListener( 'click', () =>
  {
    refreshRowButtonClick( row );
  } );
    
  // add button to delete current row
  const listBtn = document.createElement( 'button' );
  listBtn.textContent = 'Delete';
  cell = row.insertCell();
  cell.appendChild( listBtn );
  listBtn.addEventListener( 'click', () =>
  {
    deleteRowButtonClick( row );
  } );

  tblQuotes.style.display = 'block';
}
 
/**
 * Deletes the row from the parent HTML Table.
 * Hides table if this was the last quote in table.
*  Will also hide chart if deleted row was for the same stock symbol as chart.
 * @param {*} row  - row to be deleted.
 */
function deleteRowButtonClick( row ) 
{
  const tmpSymbol = row.childNodes[symbolColumnIndex].innerText;
  if ( tmpSymbol === symbolInChart )
  {
    symbolInChart = '';
    if ( divChart ) divChart.style.display = 'none';
  }

  // if last row in table, hide table
  if ( row.parentNode.rows.length === 1 )
  {
    tblQuotes.style.display = 'none';
  }

  row.parentNode.removeChild( row );
}

/**
 * Handles updating the stock price, as well as the text on the 
 * refresh button to count the refreshes. Button is disabled until timer stops.
 * If refresh counter hits limit, button text is reset, button is enabled,
 * and timer is canceled.
 * @param {*} row - row to be refreshed.
 */
function refreshQuote( row )
{
  const refreshButton = row.querySelector( '#' + refreshButtonID );
  const stockSymbol = row.childNodes[symbolColumnIndex].innerText;

  let mapValue = intervalMap.get( stockSymbol );
  if ( mapValue.refreshCounter++ === refreshMaxTimes - 1 )
  {
    // stop refreshes, reset button text and re-enable it
    mapValue.refreshCounter = 0;
    clearInterval( mapValue.intervalID ); // no more refreshes after this one
    refreshButton.textContent = refreshButtonText;
    refreshButton.disabled = false;
  }
  else
  {
    // update button text, disable if needed, fetch quote
    refreshButton.textContent = 'Refresh #' + mapValue.refreshCounter;
    if ( mapValue.refreshCounter === 1 ) refreshButton.disabled = true;
  }
 
  const companyDataPromise = getStockQuote( stockSymbol );
  companyDataPromise
    .then( ( data ) => updateRow( row, data ) )
    .catch( ( error ) =>
    {
      window.alert( error );
    } )
}

/**
 * Sets a timer for periodic refreshes of the stock price,
 * but also does an immediate refresh as refresh #1.
 * @param {*} row - row to be refreshed.
 */
function refreshRowButtonClick( row )
{
  // A map is used of stock symbol to timer ID and counter, used to stop timer.
  // this allows multiple refreshes for different companies 
  // to be happening simultaneously.

  const stockSymbol = row.childNodes[symbolColumnIndex].innerText;
  const intID = setInterval( refreshQuote, refreshInterval, row );
  let mapValue = { intervalID: intID, refreshCounter: 0 };
  intervalMap.set( stockSymbol, mapValue );
  refreshQuote( row );
}

/**
 * Updates the text in the row with the new price quote and time.
 * @param {*} row - row to be refreshed.
 * @param {*} data - object with fields for quote and timeOfQuote.
 */
function updateRow( row, data )
{
  row.childNodes[quoteColumnIndex].innerText = data.quote;
  row.childNodes[quoteColumnIndex + 1].innerText = data.timeOfQuote;
}

/**
 * Makes chart visible, updates label indicating current stock symbol
 * being charted, fetches daily price values (TimeSeries),
 * and draws the chart itself.
 * @param {*} row - row to be refreshed.
 */
 function showInChartButtonClick( row )
{
  if ( divChart ) divChart.style.display = 'block';
  symbolInChart = row.childNodes[symbolColumnIndex].innerText;
  if ( lblCurrentChartSymbol ) lblCurrentChartSymbol.innerHTML = ' for ' +
    encodeURI( symbolInChart );

  const companyStockDataPromise =
    getTimeSeries( symbolInChart );
  companyStockDataPromise
    .then( ( data ) => drawChart( canvasChart, data ) )
    .catch( ( error ) =>
    {
      if ( divChart ) divChart.style.display = 'none';
      // wrapping window.alert() to allow browser to update (hide chart)
      // before alerting the user - maybe not the best way to do this?
      window.requestAnimationFrame( () => 
      {
        window.requestAnimationFrame( () => window.alert( error ) )
      } )
    } )
}
