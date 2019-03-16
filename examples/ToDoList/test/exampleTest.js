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
const utils = require('./../../../../aepp-forgae-js/cli-commands/utils');

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
	});

	it('Caller should be same as owner.', async () => {
		let result = await deployedInstance.get_caller();
		console.log('caller:', result);
		assert.equal(result, ownerKeyPair.publicKey);
	});

	// PS: for now, there is one 'bug' get all todos return array with 1 todo that is empty /without name/
	xit('Should get "todos", there are no todos', async () => {
		let result = await deployedInstance.get_todos();
		
		assert.equal(result.length - 1, 0);
	});

	xit('Should get "todos"', async () => {
		await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.add_todo(secondTodoName);
		let result = await deployedInstance.get_todos();

		console.log(result);
		let temp = result[0].value
		console.log(temp[1].value);
		console.log();
		
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

	xit('Should get a "todo".', async () => {
		await deployedInstance.add_todo(firstTodoName);
		let todoId = await deployedInstance.add_todo(secondTodoName); 
		// let result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, todoId);
		// assert.equal(result, getTodoTemplate(firstTodoName, false));
		
		// console.log('key as hex:', utils.keyToHex(ownerKeyPair.publicKey));
		const result = await deployedInstance.call('get_todo_by_id', {
			args: `(39519965516565108473327470053407124751867067078530473195651550649472681599133, ${todoId})`,
			options: {
				ttl: 123
			},
			abi: 'sophia'
		})

		console.log(result);

		console.log(await result.decode("string"));
		
	});

	xit('Should get an empty string when there is no "todo".', async () => {
		let result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, 2);
		
		assert.equal(result, '');
	});

	xit('Should change name of a "todo".', async () => {
		let id = await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_name(id, changedTodoName);
		let result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, 1);
		
		assert.equal(result, getTodoTemplate(changedTodoName, false));
	});
	
	xit('Should change state/is completed/ of a "todo".', async () => {
		let id = await deployedInstance.add_todo(firstTodoName);
		await deployedInstance.edit_todo_state(id, true);
		let result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, 1);
		
		assert.equal(result, getTodoTemplate(firstTodoName, true));
	});

	xit('Should delete "todo" by id.', async () => {
		await deployedInstance.add_todo(firstTodoName);
		let id = await deployedInstance.add_todo(secondTodoName);
		await deployedInstance.add_todo(changedTodoName);

		let count = await deployedInstance.get_todo_count(ownerKeyPair.publicKey);
		assert.equal(count, 3, "Invalid 'todo' count.");

		let result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, id);
		assert.equal(result, getTodoTemplate(secondTodoName, false), "Returned 'Todo' is not needed one!");
		
		let isDeleted = await deployedInstance.delete_todo(id);

		result = await deployedInstance.get_todo_by_id(ownerKeyPair.publicKey, id);

		count = await deployedInstance.get_todo_count(ownerKeyPair.publicKey);
		
		assert.equal(isDeleted, 1, "Invalid returned status from deleting a 'todo'.");
		assert.equal(result, '', "Result is not empty string");
		assert.equal(count, 2, "Invalid 'todo' count.");
	});
})