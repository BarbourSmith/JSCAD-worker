const jscad = require('@jscad/modeling');
const jsonSerializer= require('@jscad/json-serializer');
const jsonDeSerializer = require('@jscad/json-deserializer')
const stlSerializer = require('@jscad/stl-serializer')


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
	var myCircle = circle({ radius: values[0]/2, segments: values[1]})
	var serializedCircle = jsonSerializer.serialize({}, myCircle)
	return [{geometry: serializedCircle, tags: []}]
}

function rect(values){
	var myCube = rectangle({size: values})
	var serializedCube = jsonSerializer.serialize({}, myCube)
	return [{geometry: serializedCube, tags: []}]
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
    var extrudedArray = []
    values[0].forEach(item => {
        var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        const extrudedObj = extrudeLinear({height: values[1]}, deserializedGeometry)
        var serializedResult = jsonSerializer.serialize({}, extrudedObj)
        extrudedArray.push({geometry: serializedResult, tags: item.tags})
    })
	return extrudedArray
}

function rotat(values){
    var rotatedArray = []
    values[0].forEach(item => {
        var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        const rotatedObj = rotate([3.1415*values[1]/180,3.1415*values[2]/180,3.1415*values[3]/180], deserializedGeometry)
        var serializedResult = jsonSerializer.serialize({}, rotatedObj)
        rotatedArray.push({geometry: serializedResult, tags: item.tags})
    })
	return rotatedArray
}

function trans(values){
    var translatedArray = []
    values[0].forEach(item => {
        var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        const translatedObj = translate([values[1],values[2],values[3]], deserializedGeometry)
        var serializedResult = jsonSerializer.serialize({}, translatedObj)
        translatedArray.push({geometry: serializedResult, tags: item.tags})
    })
	return translatedArray
}

function diff(values){
    var unioned = unon([[values[1]]])
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, unioned[0].geometry)
    
    var outputArray = []
    values[0].forEach(item => {
        var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        const subtractedObj = subtract(deserializedGeometry1, deserializedGeometry0)
        var serializedResult = jsonSerializer.serialize({}, subtractedObj)
        outputArray.push({geometry: serializedResult, tags: item.tags})
    })
	return outputArray
}

//Intersection A, B returns the parts of A which intersect with B so we are going to make a union out of B and then intersect that with each of A. 
function intersection(values){
    var unioned = unon([[values[1]]])
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, unioned[0].geometry)
    
    var outputArray = []
    values[0].forEach(item => {
        var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        const intersectionObj = intersect(deserializedGeometry1, deserializedGeometry0)
        var serializedResult = jsonSerializer.serialize({}, intersectionObj)
        outputArray.push({geometry: serializedResult, tags: item.tags})
    })
	return outputArray
}

//Form a big array of all of the individual bits in each input, then hull the whole damn thing. In this case values appears to be all of the input in an array.
function wrap(values){
    var builtArray = []
    values.forEach(input => {
        input.forEach(item => {
            var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
            builtArray.push(deserializedGeometry)
        })
    })
    
    const hullObj = hull(builtArray)
    
	var serializedResult = jsonSerializer.serialize({}, hullObj)
	return [{geometry: serializedResult, tags: []}]
}

/*
Assembly takes in any number of inputs and places them all in the the returned object
*/
function assembly(values){
    unon(values)
	var assemblyArray = []
    values[0].forEach(input => {
        input.forEach(item => {
            assemblyArray.push(item)
        })
    })
    
    //Make a new array with all the bits from up stream subtracted
    var subtractedArray = []
    var i = 0
    while(i < assemblyArray.length-1){
        var item = assemblyArray[i]
        var deserialzedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
        var upStream = union(assemblyArray.slice(i+1).map(x => jsonDeSerializer.deserialize({output: 'geometry'}, x.geometry)))
        
        var subtracted = subtract(deserialzedGeometry, upStream)
        
        item.geometry = jsonSerializer.serialize({}, subtracted)
        
        subtractedArray.push(item)
        i++
    }
    
    //Grab the last item that doesn't need anything subtracted from it
    item = assemblyArray[assemblyArray.length-1]
    subtractedArray.push(item)
    
	return subtractedArray
}

function unon(values){
    var arrayOfGeometry = []
    values[0].forEach(input => {
        input.forEach(item => {
            var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, item.geometry)
            arrayOfGeometry.push(deserializedGeometry)
        })
    })
    const unionObj = union(arrayOfGeometry)
	var serializedResult = jsonSerializer.serialize({}, unionObj)
	return [{geometry: serializedResult, tags: []}]
}

function code(values){
    
    inputs = {};
    for (key in values[1]) {
        if (values[1][key] != null && typeof values[1][key] === 'object') {
            inputs[key] = jsonDeSerializer.deserialize({output: 'geometry'}, values[1][key][0].geometry) //Only the first element of an assembly is passed to code atoms
        } else {
            inputs[key] = values[1][key];
        }
    }
    
    //These actions are available in the context that the code is executed in
    
    inputs["translate"] = translate
    inputs["sphere"] = sphere
    inputs["rotate"] = rotate
    inputs["scale"] = scale
    inputs["union"] = union
    inputs["subtract"] = subtract
    inputs["intersect"] = intersect
    
    //Evaluate the code in the created context
    const signature =
      '{ ' +
      Object.keys(inputs).join(', ') +
      ' }';
    const foo = new Function(signature, values[0]);
    const returnedGeometry = foo({...inputs });
    
    var serializedResult = jsonSerializer.serialize({}, returnedGeometry)
	return [{geometry: serializedResult, tags: []}]
}

//Just a placeholder for now
function specify(values){
    return values[0]
}

function tag(values){
    var inputAssembly = values[0]
    var tagToAdd = values[1]
    inputAssembly.forEach(item => {
        item.tags.push(tagToAdd)
    })
    return inputAssembly
}

function extractTag(values){
    extractedItems = []
    values[0].forEach(item => {
        if (item.tags.indexOf(values[1]) > -1){
            extractedItems.push(item)
        }
    })
    return extractedItems;
}

//Just a placeholder for now
function clr(values){
    return values[0]
}

function stl(values){
    
    var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, values[0].geometry)
    
    const rawData = stlSerializer.serialize({binary: false},deserializedGeometry)
    
    return rawData
}


// create a worker and register public functions
workerpool.worker({
    assemble: assembly,
 	circle: circ,
 	code: code,
    difference: diff,
    extractTag: extractTag,
    intersection:intersection,
    hull:wrap,
    specify: specify,
    stl:stl,
    tag, tag,
    color: clr,
 	translate: trans,
 	rectangle: rect,
 	extrude: extr,
 	polygon: poly,
 	rotate: rotat,
    union:unon
});