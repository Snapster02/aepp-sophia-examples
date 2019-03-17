/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */

const path = require('path');

// this will work when forgae brach: 'deployed-instance-sc-functionality-upgrade-rgx' will be merged and released
// otherwise checkout this branch 'deployed-instance-sc-functionality-upgrade-rgx' and linked it/or specified it path
// const Deployer = require('forgae').Deployer;
const Deployer = require('./../../../../aepp-forgae-js/cli-commands/forgae-deploy/forgae-deployer');
// const utils = require('./../../../../aepp-forgae-js/cli-commands/utils');

const contractPath = './../contracts/todo.aes';

const ownerKeyPair = wallets[0];

const firstTodoName = "First Todo";
const secondTodoName = "Second Todo";
const changedTodoName = "Changed Todo Name";

let shouldShowInfo = true;

function convertToTODO(data) {
	
	let isNan = isNaN(data[1].value);
	if (!Array.isArray(data) || data.length !== 2 || isNan  ) { // || (!data[0].value || !data[1].value)
		throw new Error('Cannot convert to "todo". Invalid data!');
	}

	return {
		name: data[0].value,
		isCompleted: data[1].value === 1 ? true : false
	}
}

function convertSophiaListToTodos(data) {
	let tempCollection = [];

	for(let idTodoData of data) {
		
		let idTodoInfo = idTodoData.value;

		let id = idTodoInfo[0].value;
		let todo = convertToTODO(idTodoInfo[1].value);
		todo.id = id;

		tempCollection.push(todo);
	}

	return tempCollection;
}

describe('Example Contract', () => {

	let deployedInstance;

	beforeEach(async () => {
		let deployer = new Deployer('local', ownerKeyPair.secretKey);
		deployedInstance = await deployer.deploy(path.resolve(__dirname, contractPath));
		deployedInstance.rawTx = null;

		if (shouldShowInfo) {
			shouldShowInfo = false;

			console.log();
			console.log('[FUNCTIONS]');
			console.log(deployedInstance);
			console.log();
		}
	});

	it('Caller should be same as owner.', async () => {
		let result = await deployedInstance.get_caller();
		assert.equal(result, ownerKeyPair.publicKey);
	});

	it('Should get "todos", there are no todos', async () => {
		let result = await deployedInstance.get_todos();
		
		assert.equal(result.length, 0);
	});

	it('Should get "todos"', async () => {
		let id = await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.add_todo(secondTodoName);

		await deployedInstance.edit_todo_state(id, true);

		let result = await deployedInstance.get_todos();
		let todos = convertSophiaListToTodos(result);
		
		assert.equal(todos.length, 2);
		let firstTodo = todos[0];
		let secondTodo = todos[1];

		assert.equal(firstTodo.name, firstTodoName);
		assert.equal(firstTodo.isCompleted, true);

		assert.equal(secondTodo.name, secondTodoName);
		assert.equal(secondTodo.isCompleted, false);
	});

	it('Should add "todo" successfully.', async () => {
		await assert.isFulfilled(deployedInstance.add_todo(firstTodoName), "Cannot add 'todo' successfully.");
	});

	it('Should get "todo" count', async () => {
		await deployedInstance.add_todo(firstTodoName);
		let result = await deployedInstance.get_todo_count(ownerKeyPair.publicKey);
		
		assert.equal(result, 1);
	});

	it('Should get a "todo".', async () => {
		await deployedInstance.add_todo(firstTodoName);
		let todoId = await deployedInstance.add_todo(secondTodoName); 
		
		let result = await deployedInstance.get_todo_by_id(todoId);
		let asTodo = convertToTODO(result);

		assert.equal(asTodo.name, secondTodoName, "Name is not equal!");
		assert.equal(asTodo.isCompleted, false, "'Is completed' do not match!");
	});

	it('Should return a "todo" with empty name when there is no "todo".', async () => {
		let result = await deployedInstance.get_todo_by_id(2);
		let todo = convertToTODO(result);

		assert.equal(todo.name, '');
		assert.equal(todo.isCompleted, false);
	});

	it('Should change name of a "todo".', async () => {
		let id = await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_name(id, changedTodoName);
		let result = await deployedInstance.get_todo_by_id(id);
		let todo = convertToTODO(result);
		
		assert.equal(todo.name, changedTodoName);
		assert.equal(todo.isCompleted, false);
	});
	
	it('Should change state(is completed) of a "todo".', async () => {
		let id = await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_state(id, true);
		let result = await deployedInstance.get_todo_by_id(id);
		let todo = convertToTODO(result);
		
		assert.equal(todo.name, firstTodoName);
		assert.equal(todo.isCompleted, true);
	});

	it('Should delete "todo" by id.', async () => {
		await deployedInstance.add_todo(firstTodoName);
		let id = await deployedInstance.add_todo(secondTodoName);
		await deployedInstance.add_todo(changedTodoName);

		let count = await deployedInstance.get_todo_count(ownerKeyPair.publicKey);
		assert.equal(count, 3, "Invalid 'todo' count.");

		let result = await deployedInstance.get_todo_by_id(id);
		let todo = convertToTODO(result);
		assert.equal(todo.name, secondTodoName, "Current todo 'name' do not match.");
		assert.equal(todo.isCompleted, false, "Current todo isCompleted do not match.");
		
		let isDeleted = await deployedInstance.delete_todo(id);

		result = await deployedInstance.get_todo_by_id(id);
		todo = convertToTODO(result);

		count = await deployedInstance.get_todo_count(ownerKeyPair.publicKey);
		
		assert.equal(isDeleted, 1, "Invalid returned status from deleting a 'todo'.");
		assert.equal(todo.name, '');
		assert.equal(todo.isCompleted, false);
		assert.equal(count, 2, "Invalid 'todo' count.");
	});
})