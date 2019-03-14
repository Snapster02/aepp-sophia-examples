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

const contractPath = './../contracts/todo.aes';

const ownerKeyPair = wallets[0];

function getTodoTemplate(name, isCompleted) {
	return `Name: ${name} | Is completed: ${isCompleted}`;
}

const firstTodoName = "First Todo";
const secondTodoName = "Second Todo";
const changedTodoName = "Changed Todo Name";

let shouldShowInfo = true;

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
	})

	/*  EXAMPLE

	it('Caller should be same as owner.', async () => {
		let result = await deployedInstance.get_caller();
		console.log(result);
		assert.equal(result, ownerKeyPair.publicKey);
	});

	*/

	it('Caller should be same as owner.', async () => {
		let result = await deployedInstance.get_caller();
		
		assert.equal(result, ownerKeyPair.publicKey);
	});

	// PS: for now there is one 'bug' get all todos return array with 1 todo that is empty /without name/
	it('Should get "todos", there are no todos', async () => {
		let result = await deployedInstance.get_todos();
		
		assert.equal(result.length - 1, 0);
	});

	it('Should get "todos"', async () => {
		await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.add_todo(secondTodoName);
		let result = await deployedInstance.get_todos();
		
		assert.equal(result.length - 1, 2);
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
		let result = await deployedInstance.get_todo_by_index(ownerKeyPair.publicKey, 1);
		
		assert.equal(result, getTodoTemplate(firstTodoName, false));
	});

	it('Should change name of a "todo".', async () => {
		await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_name(1, changedTodoName);
		let result = await deployedInstance.get_todo_by_index(ownerKeyPair.publicKey, 1);
		
		assert.equal(result, getTodoTemplate(changedTodoName, false));
	});
	
	it('Should change state/is completed/ of a "todo".', async () => {
		await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_state(1, true);
		let result = await deployedInstance.get_todo_by_index(ownerKeyPair.publicKey, 1);
		
		assert.equal(result, getTodoTemplate(firstTodoName, true));
	});
})