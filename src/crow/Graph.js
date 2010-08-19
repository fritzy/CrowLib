goog.provide('crow.Graph');
goog.require('crow.Algorithm');
goog.require('crow.algorithm.LinearAlgorithm');
goog.require('crow.algorithm.DijkstraAlgorithm');

/**
 * @constructor
 */
crow.Graph = function(){
	// initialize
	this.nodes = [];
	this.map = {};
	this.version = "0.7.0";
	
	// methods
	// Add a node to this crow.Graph
	// O(1)
	this.addNode = function(node){
		this.nodes.push(node);

		var x = node.getX(), y = node.getY();
		if(typeof x !== "number") throw new Error("Node must have a valid x coord");
		if(typeof y !== "number") throw new Error("Node must have a valid y coord");
		x = Math.floor(x);
		y = Math.floor(y);
		
		if(!this.map[x]) this.map[x] = {};
		this.map[x][y] = node;
	};
	// Remove a node at given coordinates from crow.Graph
	// O(n) where n is number of total nodes
	this.removeNode = function(x, y){
		if(this.map[x] && this.map[x][y]){
			delete this.map[x][y];
			if(this.map[x].length == 0) delete this.map[x];
		}
		for(var i in this.nodes){
			var node = this.nodes[i];
			if(node.getX() == x && node.getY() == y){
				this.nodes.splice(i, 1);
				break;
			}
		}
	};
	// Gets a node at a particular coordinate, or the first node that meets a condition
	// O(1) if a coordinate is given
	// O(n) if a filter is given (n being number of total nodes)
	this.getNode = function(x_or_filter, y){
		if(typeof x_or_filter === "function"){
			for(var i in this.nodes){
				var n = this.nodes[i];
				if(x_or_filter.call(n)) return n;
			}
		} else {
			if(typeof(x_or_filter) !== "number") throw new Error("x coordinate not provided");
			if(typeof(y) !== "number") throw new Error("y coordinate not provided");

			var x_map = this.map[x_or_filter];
			if(x_map){
				return x_map[y];
			}
		}
		return undefined;
	};
	// Get multiple nodes...has 3 options:
	//  1) pass a filter function: O(n)
	//  2) pass an options object with a `start` node (optional), an `algorithm` (optional; search-type), and a `filter` (optional): running time varies by algorithm
	//  3) pass nothing, in which case all nodes will be returns: O(1)
	this.getNodes = function(filter_or_options){
		switch(typeof filter_or_options){
			case "function":
				return this.getNodes({
					filter: filter_or_options
				});
			case "object":
				var start = filter_or_options.start || this.nodes[0];
				var algo = crow.Graph._lookupAlgorithm(filter_or_options.algorithm) || crow.Graph.defaultAlgorithm.search;
				if(!(algo.prototype instanceof crow.algorithm.SearchAlgorithm)) throw new Error("only compatible with SearchAlgorithms")
				return (new algo(this)).search(start, {
					filter: filter_or_options.filter
				});
			case "undefined":
				return this.nodes;
			default:
				throw new Error("unsupported object " + filter_or_options.toString());
		}
	};
	
	// Find the shortest path to a goal.  Pass in an options object with:
	//  `start`: start node (optional)
	//  `goal`: end node or end condition (callback is passed each node discovered: return true if match, false otherwise) (required)
	//  `algo`: shortestPath-type algorithm to use (optional)
	//  Running time varies by algorithm
	this.findGoal = function(opts){
		crow.Algorithm.initializeDataStructures();
		var start = opts.start || this.nodes[0];
		var goal = opts.goal;
		if(!goal) throw new Error("To find a goal, one must provide a goal...");
		var algo = crow.Graph._lookupAlgorithm(opts.algorithm) || crow.Graph.defaultAlgorithm.shortestPath;
		if(!(algo.prototype instanceof crow.algorithm.ShortestPathAlgorithm)) throw new Error("only compatible with ShortestPathAlgorithms")
		return (new algo(this)).findPath(start, goal, opts);
	};
};
crow.Graph.algorithm = {};
crow.Graph.defaultAlgorithm = {};

// Extension for EffectGames to facilitate creation of crow.Graphs
crow.Graph.fromTilePlane = function(tplane, callback){
	if(!window.Effect || !window.Effect.Port) throw new Error("EffectGames-specific extensions don't work anywhere else");
	if(!tplane) throw new Error("tplane is required");
	if(typeof callback !== "function") throw new Error("callback not provided or not a function");

	var g = new crow.Graph();
	for(var i = 0, ilen = tplane.getMaxTileX(); i < ilen; i++){
		for(var j = 0, jlen = tplane.getMaxTileY(); j < jlen; j++){
			var tile = tplane.lookupTile(i, j),
				tileData = tplane.lookupTile(i, j, true);
			var node = callback(tile, tileData);
			if(node) g.addNode(node);
		}
	}
	return g;
};
crow.Graph.registerAlgorithm = function(algo, name, isDefaultForType){
	crow.Graph.algorithm[name] = algo;
	if(isDefaultForType){
		var instance = new algo();
		if(instance instanceof crow.algorithm.SearchAlgorithm){
			crow.Graph.defaultAlgorithm.search = algo;
		} else if(instance instanceof crow.algorithm.ShortestPathAlgorithm){
			crow.Graph.defaultAlgorithm.shortestPath = algo;
		}
	}
};
crow.Graph._lookupAlgorithm = function(name){
	if(name){
		var algo = crow.Graph.algorithm[name];
		if(algo) return algo;
		else throw new Error("Algorithm `" + name + "` not found");
	} else return undefined;
};

crow.Graph.registerAlgorithm(crow.algorithm.LinearAlgorithm, 'linear', true);
crow.Graph.registerAlgorithm(crow.algorithm.DijkstraAlgorithm, 'dijkstra', true);

crow.GraphUtil = {
	distance: {
		pythagoras: function(dx, dy){
			return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
		},
		manhattan: function(dx, dy){
			return Math.abs(dx) + Math.abs(dy);
		}
	}
};
