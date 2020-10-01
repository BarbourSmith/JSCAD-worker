const jscad = require('@jscad/modeling');
const jsonSerializer= require('@jscad/json-serializer');
const jsonDeSerializer = require('@jscad/json-deserializer')


const workerpool = require('workerpool');

const {
  color,
  connectors,
  geometry,
  math,
  primitives,
  text,
  utils,

  booleans,
  expansions,
  extrusions,
  hulls,
  measurements,
  transforms
} = jscad

const { cuboid, sphere, cylinder, circle, star, rectangle } = require('@jscad/modeling').primitives
const { translate, rotate, scale } = transforms
const { hull } = hulls
const { union, subtract, intersect} = booleans
const { colorize } = require('@jscad/modeling').colors
const { extrudeLinear, extrudeRectangular, extrudeRotate } = require('@jscad/modeling').extrusions


function circ(values){
	var myCircle = colorize([1, 0, 0, 0.75],circle({ radius: values[0]}))
	var serializedCircle = jsonSerializer.serialize({}, myCircle)
	return serializedCircle
}

function rect(values){
	var myCube = rectangle({size: values})
	var serializedCube = jsonSerializer.serialize({}, myCube)
	return serializedCube
}

//not working
function poly(values){
	let roof = [[100,110], [0,110], [50,200]]
	let wall = [[0,0], [10,0], [10,10], [0,10]]

	let poly = polygon({ points: roof })
	var serializedPoly = jsonSerializer.serialize({}, poly)
	return serializedPoly
}

function extr(values){

	let geometry = values[0]
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const extrudedObj = extrudeLinear({height: values[1]}, deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, extrudedObj)
	return serializedResult
}

function rotat(values){
	let geometry = values[0]
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const rotatedObj = rotate([Math.PI / values[1],values[2],values[3]], deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, rotatedObj)
	return serializedResult
}

function trans(values){
	
	let geometry = values[0]
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const translatedObj = translate([values[1],values[2],values[3]], deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, translatedObj)
	return serializedResult
}

function diff(values){
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, values[0])
	var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, values[1])
	const subtractedObj = subtract(deserializedGeometry0, deserializedGeometry1)
	var serializedResult = jsonSerializer.serialize({}, subtractedObj)
	return serializedResult
}

function intersection(values){
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, values[0])
	var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, values[1])
	const intersectionObj = intersect(deserializedGeometry0, deserializedGeometry1)
	var serializedResult = jsonSerializer.serialize({}, intersectionObj)
	return serializedResult
}

function wrap(values){
	var deserializedGeometry = values.map(x => jsonDeSerializer.deserialize({output: 'geometry'}, x))
    
    const hullObj = hull(deserializedGeometry)
    
	var serializedResult = jsonSerializer.serialize({}, hullObj)
	return serializedResult
}

function assembly(values){
	var deserializedGeometry = values[0].map(x => jsonDeSerializer.deserialize({output: 'geometry'}, x))
    
    const unionObj = union(deserializedGeometry)
    
	var serializedResult = jsonSerializer.serialize({}, unionObj)
	return serializedResult
}


// create a worker and register public functions
workerpool.worker({
    assemble: assembly,
 	circle: circ,
    difference: diff,
    intersection:intersection,
    hull:wrap,
 	translate: trans,
 	rectangle: rect,
 	extrude: extr,
 	polygon: poly,
 	rotate: rotat
});