'use strict';

const SortedArray = require('./extended-sorted-array.js');

/**
 * Structure containing the neighborhood of a peer.
 * @class PartialView
 */
class PartialView {
	/**
	 * Constructor of PartialView
	 * @constructor
	 * @param {object} options Object containing all options
	 * @param {double} options.usedCoef Represents the amount of clients shuffled between [0;1]
	 */
	constructor (options) {
		// #1 initialize the partial view as an array sorted by age
		// entries are {age, id, socketId}

		// Coef : [0;1]
		this.usedCoef = options.usedCoef;

		this.comparator = (a, b) => {
			const first = a.age || a;
			const second = b.age || b;
			if (first < second) {
				return -1;
			}
			if (first > second) {
				return 1;
			}
			return 0;
		};

		this.array = new SortedArray(this.comparator);
	}

	/**
	 * Get the oldest peer in the partialView
	 * @return {object} the oldest peer in the array
	 */
	getOldest () {
		return this.array.arr[0];
	}


	/**
	 * Increment the age of the whole partial view
	 * @return {void}
	 */
	increment () {
		for (let i = 0; i < this.array.arr.length; ++i) {
			this.array.arr[i].age += 1;
		}
	}

	/**
	 * Get a sample of the partial view
	 * @param {string} neighbor the neighbor which performs the exchange with us
	 * @param {boolean} isInitiator whether or not the caller is the initiator of the
	 * exchange
	 * @return {array} an array containing neighbors from this partial view
	 */
	getSample (neighbor, isInitiator) {
		let sample = [];
		// #1 copy the partial view
		let clone = new SortedArray(this.comparator);
		for (let i = 0; i < this.array.arr.length; ++i) {
			clone.arr.push(this.array.arr[i]);
		}
		// #2 process the size of the sample
		const sampleSize = Math.ceil(this.array.arr.length * this.usedCoef);
		if (isInitiator) {
			// #A remove an occurrence of the chosen neighbor
			clone.remove(neighbor);
			sample.push(neighbor);
		}

		// #3 randomly add neighbors to the sample
		while (sample.length < sampleSize) {
			const rn = Math.floor(Math.random() * clone.arr.length);
			sample.push(clone.arr[rn]);
			clone.arr.splice(rn, 1);
		}

		return sample;
	}

	/**
	 * Replace the occurrences of the old peer by the fresh one
	 * @param {array} sample the sample to modify
	 * @param {object} old the old reference to replace
	 * @param {object} fresh the new reference to insert
	 * @return {array} an array with the replaced occurences
	 */
	replace (sample, old, fresh) {
		const result = [];
		for (let i = 0; i < sample.length; ++i) {
			if (sample[i].id === old.id) {
				result.push(fresh);
			} else {
				result.push(sample[i]);
			}
		}
		return result;
	}

	/**
	 * Add the neigbhor to the partial view with an age of 0
	 * @param {object} config the peer to add to the partial view
	 * @return {void}
	 */
	addNeighbor (config) {
		this.array.arr.push(config);
	}

	/**
	 * Get the index of the peer in the partialview
	 * @param {string} id The id of the peer inside the partialView.
	 * @return {integer} the index of the peer in the array, -1 if not found
	 */
	getIndex (id) {
		let i = this.array.arr.length - 1;
		let index = -1;
		let found = false;
		while (!found && i >= 0) {
			if (id === this.array.arr[i].id) {
				found = true;
				index = i;
			}
			--i;
		}
		return index;
	}

	/**
	 * Remove the peer from the partial view
	 * @param {string} id the peer to remove
	 * @param {integer} age The age of the peer
	 * @return {object} the removed entry if it exists, null otherwise
	 */
	removePeer (id, age) {
		if (!age) {
			const index = this.getIndex(id);
			let removedEntry = null;
			if (index > -1) {
				removedEntry = this.array.arr[index];
				this.array.arr.splice(index, 1);
			}
			return removedEntry;
		} else {
			this.removePeerAge(id, age);
		}
	}

	/**
	 * Remove all occurrences of the peer and return the number of removals
	 * @param {string} id the peer to remove
	 * @return {integer} the number of occurrences of the removed peer
	 */
	removeAll (id) {
		let occ = 0;
		let i = 0;
		while (i < this.array.arr.length) {
			if (this.array.arr[i].id === id) {
				this.array.arr.splice(i, 1);
				occ += 1;
			} else {
				++i;
			}
		}
		return occ;
	}

	/**
	 * Remove all the elements contained in the sample in argument
	 * @param {array} sample the elements to remove
	 * @return {void}
	 */
	removeSample (sample) {
		for (let i = 0; i < sample.length; ++i) {
			this.removePeer(sample[i].id, sample[i].age);
		}
	}

	/**
	 * Get the size of the partial view
	 * @return {integer} the size of the partial view
	 */
	length () {
		return this.array.arr.length;
	}

	/**
	 * Check if the partial view contains the reference
	 * @param {string} id the peer to check
	 * @return {boolean} true if the peer is in the partial view, false otherwise
	 */
	contains (id) {
		return this.getIndex(id) >= 0;
	}

	/**
	 * brief remove all elements from the partial view
	 * @return {void}
	 */
	clear () {
		this.array.arr.splice(0, this.array.arr.length);
	}

	/**
	 * Get the array containing views
	 * @return {array} Array with all views
	 */
	get () {
		return this.array.arr;
	}

	/**
	 * Remove the peer with the associated age from the partial view
	 * @param {string} id the peer to remove
	 * @param {integer} age the age of the peer to remove
	 * @return {object} the removed entry if it exists, null otherwise
	 */
	removePeerAge (id, age) {
		let found = false;
		let i = 0;
		let removedEntry = null;
		while (!found && i < this.array.arr.length) {
			if (id === this.array.arr[i].id && age === this.array.arr[i].age) {
				found = true;
				removedEntry = this.array.arr[i];
				this.array.arr.splice(i, 1);
			}
			++i;
		}
		return removedEntry;
	}
}


module.exports = PartialView;
