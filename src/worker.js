const jscad = require('@jscad/modeling')
const { entitiesFromSolids } = require('@jscad/regl-renderer') 
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

const { cuboid, sphere, cylinder, circle, star, rectangle, torus } = require('@jscad/modeling').primitives
const { translate, rotate, scale } = transforms
const { hull } = hulls
const { union, subtract, intersect} = booleans
const { colorize, colorNameToRgb } = require('@jscad/modeling').colors
const { measureBoundingBox } = require('@jscad/modeling').measurements
const { extrudeLinear, extrudeRectangular, extrudeRotate } = require('@jscad/modeling').extrusions


function circ(values){
	var myCircle = circle({ radius: values[0]/2, segments: values[1]})
	return [{geometry: myCircle, tags: [], color: "pink", circle: {radius: values[0]/2, segments: values[1]}}]
}

function rect(values){
	var myCube = rectangle({size: values})
	return [{geometry: myCube, tags: [], color: "pink", rectangle: {size: values}}]
}

function extr(values){
    var extrudedArray = []
    values[0].forEach(item => {
        var extrudedObj
        if(item.circle){
            //Create a cylinder instead of an extrusion to avoid issues with extrude
            console.log("Circle seen")
            const bounds = measureBoundingBox(item.geometry)
            const x = (bounds[1][0] - bounds[0][0])/2 + bounds[0][0]
            const y = (bounds[1][1] - bounds[0][1])/2 + bounds[0][1]
            extrudedObj = cylinder({center:[x,y,values[1]/2], height: values[1], radius: item.circle.radius, segments: item.circle.segments})
        }
        else if(item.rectangle){
            console.log("Rectangle seen")
            const bounds = measureBoundingBox(item.geometry)
            const x = (bounds[1][0] - bounds[0][0])/2 + bounds[0][0]
            const y = (bounds[1][1] - bounds[0][1])/2 + bounds[0][1]
            var size = item.rectangle.size
            size.push(values[1])
            extrudedObj = cuboid({center:[x,y,values[1]/2], size: size})
        }
        else{
            console.log("Third option seen")
            const extrudedObj = extrudeLinear({height: values[1]}, item.geometry)
        }
        extrudedArray.push({geometry: extrudedObj, tags: item.tags, color: item.color})
    })
	return extrudedArray
}

function rotat(values){
    var rotatedArray = []
    values[0].forEach(item => {
        const rotatedObj = rotate([3.1415*values[1]/180,3.1415*values[2]/180,3.1415*values[3]/180], item.geometry)
        rotatedArray.push({geometry: rotatedObj, tags: item.tags, color: item.color})
    })
	return rotatedArray
}

function trans(values){
    var translatedArray = []
    values[0].forEach(item => {
        item.geometry = translate([values[1],values[2],values[3]], item.geometry)
        translatedArray.push(item)
    })
	return translatedArray
}

function diff(values){
    var unioned = unon([[values[1]]])
	var deserializedGeometry0 = unioned[0].geometry
    
    var outputArray = []
    values[0].forEach(item => {
        const subtractedObj = subtract(item.geometry, deserializedGeometry0)
        outputArray.push({geometry: subtractedObj, tags: item.tags, color: item.color})
    })
	return outputArray
}

//Intersection A, B returns the parts of A which intersect with B so we are going to make a union out of B and then intersect that with each of A. 
function intersection(values){
    var unioned = unon([[values[1]]])
	var deserializedGeometry0 = unioned[0].geometry
    
    var outputArray = []
    values[0].forEach(item => {
        const intersectionObj = intersect(item.geometry, deserializedGeometry0)
        outputArray.push({geometry: intersectionObj, tags: item.tags, color: item.color})
    })
	return outputArray
}

//Form a big array of all of the individual bits in each input, then hull the whole damn thing. In this case values appears to be all of the input in an array.
function wrap(values){
    var builtArray = []
    values.forEach(input => {
        input.forEach(item => {
            builtArray.push(item.geometry)
        })
    })
    
    const hullObj = hull(builtArray)
    
	return [{geometry: hullObj, tags: [], color: "pink"}]
}

/*
Assembly takes in any number of inputs and places them all in the the returned object
*/
function assembly(values){
    
    var inputs = values[0] //Inputs is an array of assemblies with the least dominant input first [[{},{},{}],[{},{}]]
    
    // var count = 0
    // inputs.forEach(input => {
        // input.forEach(item => {
            // count++;
        // })
    // })
    // console.log("Number of arguments to assembly: " + count)
    // if(count > 10){
        // console.log("Assembly currently only supports up to ten arguments")
        // return -1
    // }

    
    //Generate a subtracted array which contains geometry which has already had upstream inputs subtracted from it
    // var i = 0
    // while(i <= inputs.length - 2){
        // inputs[i].forEach(itemToSubtractFrom  => {       //Subtract all of the upstream input's items
            // var j = i + 1
            // while(j <= inputs.length - 1){               //Walk through each of the upstream inputs
                // inputs[j].forEach(itemToSubtract => {    //And subtract each of it's items
                    // itemToSubtractFrom.geometry = subtract(itemToSubtractFrom.geometry, itemToSubtract.geometry)
                // })
                // j++
            // }
        // })
        // i++
    // }
    
    //At this point inputs contains all of the geometry and it has been subtracted except the last input
    
    
    //Join them all into a single array
    var subtractedArray = []
    subtractedArray = subtractedArray.concat(...inputs)
    
	return subtractedArray
}

function unon(values){
    var arrayOfGeometry = []
    var tags = []
    values[0].forEach(input => {
        input.forEach(item => {
            arrayOfGeometry.push(item.geometry)
            tags = tags.concat(item.tags)
        })
    })
    const unionObj = union(arrayOfGeometry)

	return [{geometry: unionObj, tags: [], color: "pink"}]

}

function code(values){
    
    inputs = {};
    for (key in values[1]) {
        if (values[1][key] != null && typeof values[1][key] === 'object') {
            inputs[key] = values[1][key][0].geometry //Only the first element of an assembly is passed to code atoms
        } else {
            inputs[key] = values[1][key];
        }
    }
    
    //These actions are available in the context that the code is executed in
    
    inputs["translate"] = translate
    inputs["sphere"] = sphere
    inputs["torus"] = torus
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
    
	return [{geometry: returnedGeometry, tags: [], color: "pink"}]
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
    
    function tagNotPresent(item) {
        return item.tags.indexOf(values[1]) == -1
    }
    
    try{
        extractedItems = []
        var i = 0
        while(i < values[0].length){
            if (values[0][i].tags.indexOf(values[1]) > -1){
                var item = values[0][i]
                var upstream = values[0].slice(i).filter(tagNotPresent).map(item => item.geometry)  //Everything upstream...which doesn't have the target tag...get it's geometry
                if(upstream.length > 0){
                    item.geometry = subtract(item.geometry, union(upstream))
                }
                extractedItems.push(item)
            }
            i++
        }
        return extractedItems;
    }catch(err){
        console.log(err)
        return -1
    }
}

function clr(values){

    var coloredArray = []
    values[0].forEach(item => {
        coloredArray.push({geometry: item.geometry, tags: item.tags, color: values[1]})
    })
    return coloredArray
}

function stl(values){
    const unionized = union(values[0].map(x => x.geometry))  //Union to compress it all into one
    
    const rawData = stlSerializer.serialize({binary: false},unionized)
    
    return rawData
}

function render(shape){
    try{
        var solids = entitiesFromSolids({}, shape.map(shape => {
            //Delete Spaces in colorName
            var cssColor = shape.color.replace(/ /g, "")
            //Pass name into RGB
            var chosenColor = colorNameToRgb(cssColor)
            return colorize(chosenColor, shape.geometry)
        }))
    }
    catch(err){
        console.log(err)
    }
    
    return solids
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
    render:render,
    stl:stl,
    tag, tag,
    color: clr,
 	translate: trans,
 	rectangle: rect,
 	extrude: extr,
 	rotate: rotat,
    union:unon
});