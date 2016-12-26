var mysql = require('mysql')
var inquirer = require('inquirer')
var Table = require('cli-table')

var connection = mysql.createConnection({
	host: 'localhost',
	port: 3306,
	user: '',
	password: '',
	database: 'Bamazon'
})

// globals used to populate tables and confirm order with up to date info
var listofProducts = []
var selectedProduct = undefined

var prompts = 
[
	{
		type: 'input',
		message: 'Please enter the id of the product you would like to purchase',
		name: 'id',
		// makes sure input is an integer in the available range, stores the selection to the global variable selectedProduct to use later
		filter: function(id) {
			return parseInt(id)
		},
		validate: function(id) {
			for (var i in listofProducts) {
				if (listofProducts[i].ItemID == parseInt(id)) {
					selectedProduct = id
					return true
				}
			}
			// if something other than an int in the product range is entered, the user is prompted again
			return 'That product id is not available.'
		}
	},
	{
		type: 'input',
		message: 'How many units of this product would you like to purchase?',
		name: 'quantity',
		// checks if the input amount is greater than the stock value for the product and that it's an int value
		filter: function(unit) {
			return parseInt(unit)
			},
		validate: function(unit) {
			for (var i in listofProducts) {
				if (listofProducts[i].ItemID == selectedProduct && listofProducts[i].StockQuantity >= parseInt(unit))  {
					return true
				}
			}
			// prompts the user again if the stock value is less than they're requesting
			return 'That amount is not currently available.'
		}
	}
]

function displayItems(res) {
	// instantiate Table object
	var table = new Table({
		head: ['Product ID', 'Product Name', 'Price'], colWidths: [15, 15, 15]
	})

	for (var i in res) {
		// appends rows to table that gets displayed to the user before ordering
		table.push([res[i].ItemID, res[i].ProductName, '$' + res[i].Price])
		// list of objects populated as listofProducts to be used by the placeOrder query
		var obj = {
			ItemID : res[i].ItemID,
			ProductName: res[i].ProductName,
			Price: res[i].Price,
			StockQuantity: res[i].StockQuantity
		}
		listofProducts.push(obj)
	}
	console.log(table.toString())
}

function placeOrder(input) {
	connection.query('UPDATE products SET StockQuantity = StockQuantity - ' + connection.escape(input.quantity) + ' WHERE ItemID = ' + connection.escape(input.id), function(err,res) {
		if (err) throw err;

		// looks for the price of the selected item
		for (var i in listofProducts) {
			if (listofProducts[i].ItemID == input.id) {
				var Price = listofProducts[i].Price
			}
		}

		var total = Price * input.quantity
		console.log('The total price for your order is $' + total)
	})
}

// query used to pull the latest data on products before prompting the customer; populates the products array
connection.query('SELECT ItemID, ProductName, Price, StockQuantity FROM Products', function(err, res) {
	if (err) throw err;
	
	displayItems(res)

	// runs the placeOrder function after all prompts have been filled out and validated; passes all selections in
	inquirer.prompt(prompts).then(function(answers) {
		placeOrder(answers)
	})
})