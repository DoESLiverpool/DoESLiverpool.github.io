
var SVGfileprocess = function(fname, fnum) 
{
    this.fname = fname; 
    this.fnum = fnum; 
    this.state = "constructed"; 
}


var spnums = { }, spcount = 0; 
SVGfileprocess.prototype.WorkOutPixelScale = function() 
{
    var sheight = this.tsvg.attr("height"); 
    var swidth = this.tsvg.attr("width"); 
    var viewBox = []; // (seemingly unable to lift the viewBox as an attribute)
    this.txt.replace(/viewBox="(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)/g, 
        function(a, x, y, w, h) { 
            viewBox.push(parseFloat(x), parseFloat(y), parseFloat(w), parseFloat(h)); 
    }); 

    console.log("facts:" + sheight+"  "+swidth + "  "+viewBox); 
    var mmheight, mmwidth; 
    if (sheight != undefined) {
        console.assert(sheight.match(/.*?(mm|in)$/g)); 
        mmheight = parseFloat(sheight) * (sheight[sheight.length-1] == 'n' ? 25.4 : 1); 
    }
    if (swidth != undefined) {
        console.assert(swidth.match(/.*?(mm|in)$/g)); 
        mmwidth = parseFloat(swidth) * (swidth[swidth.length-1] == 'n' ? 25.4 : 1); 
    }
    
    var inkscapedefaultmmpix = 90/25.4; 
    if (viewBox.length != 0) {
        this.mmpixwidth = viewBox[2]/mmwidth; 
        this.mmpixheight = viewBox[3]/mmheight; 
    } else {
        this.mmpixwidth = inkscapedefaultmmpix; 
        this.mmpixheight = inkscapedefaultmmpix; 
    }
    
    $("#pixscaleX").text(this.mmpixwidth.toFixed(3)); 
    $("#pixscaleY").text(this.mmpixheight.toFixed(3)); 
}
    
SVGfileprocess.prototype.processSingleSVGpath = function(d, cmatrix, stroke)
{
    var dtrans = Raphael.mapPath(d, cmatrix); // Raphael.transformPath(d, raphtranslist.join("")); 
    if (dtrans.length <= 1)
        return; // skip
    if ((stroke == "none") || (stroke === undefined))
        return; // skip
        
    if (this.spnums[stroke] === undefined) {
        this.spnums[stroke] = ++this.spcount; 
        $("#spnumcols").append($('<span id="spnum'+this.spcount+'">X</span>').css("background", stroke)); 
    }
    var spnum = this.spnums[stroke]; 
    
    var i0 = 0; 
    var mi = 0; 
    while (i0 < dtrans.length) {
        var i1 = i0 + 1; 
        while ((i1 < dtrans.length) && (dtrans[i1][0] != "M"))
            i1++; 
            
        // this is the place to separate out the paths by M positions
        var path = paper1.path(dtrans.slice(i0, i1)); 
        path.attr({stroke:stroke, "stroke-width":2}); 
        rlist.push(path); 
        this.rlistb.push({path:path, spnum:spnum, d:d, mi:mi, cmatrix:cmatrix}); 
        
        i0 = i1; 
        mi++; 
    }
}

SVGfileprocess.prototype.importSVGpathR = function() 
{
    while (this.cstack.length == this.pback.pos) 
        this.pback = this.pstack.pop(); 
    if (this.cstack.length == 0) {
        //processimportedSVG(rlistbyfnum[fnum]); // calls out to the big one
        return false; 
    }
    var c = this.cstack.pop(); 
    var tag = c.prop("tagName").toLowerCase(); 
    var raphtranslist = this.pback.raphtranslist; 
    var cmatrix = this.pback.cmatrix; 
    if (c.attr("transform")) {
        raphtranslist = raphtranslist.slice(); 
        raphtranslist.push(c.attr("transform").replace(/([mtrs])\w+\s*\(([^\)]*)\)/gi, function(a, b, c) { return b.toLowerCase()+c+(b.match(/s/i) ? ",0,0" : ""); } )); 
        cmatrix = paper1.path().transform(raphtranslist.join("")).matrix; 
    }

    var strokelist = this.pback.strokelist; 
    var cstroke = c.attr("stroke") || c.css("stroke") || this.mclassstroke[c.attr("class")]; 
    if (cstroke) {
        strokelist = strokelist.slice(); 
        strokelist.push(cstroke); 
    } else {
        cstroke = strokelist[strokelist.length - 1]; 
    }
    if (tag == "pattern") {
        console.log("skip pattern"); 
    } else if ((tag == "polygon") || (tag == "polygline")) {
        var ppts = c.attr("points").split(/\s+|,/);
        var x0 = ppts.shift(); 
        var y0 = ppts.shift();
        var d = 'M'+x0+','+y0+'L'+ppts.join(' ')+(tag == "polygon" ? "Z" : ""); 
        this.processSingleSVGpath(d, cmatrix, cstroke); 
    } else if (tag == "circle") {
        var cx = parseFloat(c.attr("cx"));
        var cy = parseFloat(c.attr("cy")); 
        var r = parseFloat(c.attr("r")); 
        var d = "M"+(cx-r)+","+cy+"A"+r+","+r+",0,0,1,"+cx+","+(cy-r)+"A"+r+","+r+",0,1,1,"+(cx-r)+","+cy; 
        this.processSingleSVGpath(d, cmatrix, cstroke); 
    } else if (tag == "rect") {
        var x0 = parseFloat(c.attr("x"));
        var y0 = parseFloat(c.attr("y")); 
        var x1 = x0 + parseFloat(c.attr("width")); 
        var y1 = y0 + parseFloat(c.attr("height")); 
        var d = "M"+x0+","+y0+"L"+x0+","+y1+" "+x1+","+y1+" "+x1+","+y0+"Z"; 
        this.processSingleSVGpath(d, cmatrix, cstroke); 
    } else if (tag == "path") {
        this.processSingleSVGpath(c.attr("d"), cmatrix, cstroke); 
    } else {
        this.pstack.push(this.pback); 
        this.pback = { pos:this.cstack.length, raphtranslist:raphtranslist, strokelist:strokelist, cmatrix:cmatrix }; 
        var cs = c.children(); 
        for (var i = cs.length - 1; i >= 0; i--) 
            this.cstack.push($(cs[i]));   // in reverse order for the stack
    }
    $("#readingcancel").text(this.rlistb.length+"/"+this.cstack.length); 
    return true; 
}

SVGfileprocess.prototype.InitiateLoadingProcess = function(txt) 
{
    this.state = "loading"; 
    this.txt = txt; 
    this.tsvg = $($(txt).children()[0]).parent(); // seems not to work directly as $(txt).find("svg")
    this.WorkOutPixelScale();  

    this.bcancelIm = false; 
    this.timeoutcyclems = 10; 
    this.pback = {pos:-1, raphtranslist:[""], strokelist:[undefined], cmatrix:Raphael.matrix() };
    this.pstack = [ ]; 
    this.cstack = [ this.tsvg ]; 
    this.mclassstroke = { }; 
    this.tsvg.find("style").text().replace(/\.([\w\d\-]+)\s*\{[^\}]*stroke:\s*([^;\s\}]+)/gi, function(a, b, c) { mclassstroke[b] = c; }); 
    this.rlistb = [ ]; 
    this.spnums = { }; 
    this.spcount = [ ]; 
    
    this.state = "importsvgr"; 
    var outerthis = this; 
    function importSVGpathRR() {
        if (outerthis.bcancelExIm) {
            $("#readingcancel").text("CANCELLED"); 
            outerthis.state = "cancelledimportsvgr"; 
        } else if (outerthis.importSVGpathR()) {
            setTimeout(importSVGpathRR, outerthis.timeoutcyclems); 
        } else {
            outerthis.state = "doneimportsvgr"; 
            outerthis.processimportedSVG(); 
        }
    }
    importSVGpathRR(); 
}




function ProcessToPathGroupings(rlistb, closedist)
{
    // extract the spnums
    var mspnums = { }; 
    for (var i = 0; i < rlistb.length; i++) {
        mspnums[rlistb[i].spnum] = 1; 
    }
    var spnums = Object.keys(mspnums); 
    
    // form the closed path sequences per spnum
    var spnumscp = spnums;  // this filters out the paths considered for forming cycles by colour
    var jdseqs = [ ];  // indexes dlist
    for (var ispnum = 0; ispnum < spnumscp.length; ispnum++) {
        var spnum = spnumscp[ispnum]; 
        $("#readingcancel").text("joining spnum="+spnum); 
        var dlist = [ ]; 
        var npathsc = 0; 
        for (var i = 0; i < rlistb.length; i++) {
            dlist.push(rlistb[i].spnum == spnum ? rlistb[i].path.attrs.path : null); 
            npathsc++; 
        }
        var ljdseqs = PolySorting.FindClosedPathSequencesD(dlist, closedist); 
        var npathsleft = 0; 
        for (var i = 0; i < ljdseqs.length; i++)
            npathsleft += ljdseqs[i].length; 
        //console.log("ljdseqs", spnum, "joined", npathsc, "left", npathsleft);  // could use not-joined paths as a guess of which colours to filter as engravings
        jdseqs = jdseqs.concat(ljdseqs); 
    }
    // jdseqs = [ [i1, i2, i3,...] sequence of dlist[ii/2|0], bfore=((ii%2)==1 ]

    // list of paths not included in any cycle
    $("#readingcancel").text("getsingletlist"); 
    var singletslist = PolySorting.GetSingletsList(jdseqs, dlist.length)

    // build the dlist without any holes parallel to rlistb to use for groupings
    var dlist = [ ]; 
    for (var i = 0; i < rlistb.length; i++) 
        dlist.push(rlistb[i].path.attrs.path); 
    $("#readingcancel").text("concat JDgeoseqs"); 
    var jdgeos = [ ]; 
    for (var i = 0; i < jdseqs.length; i++) {
        jdgeos.push(PolySorting.JDgeoseq(jdseqs[i], dlist)); // concatenated sequences of paths forming the boundaries
    }

    // groups of jdsequences forming outercontour, islands, singlets 
    $("#readingcancel").text("FindAreaGroupingsD"); 
    var res = [ ]; 
    var cboundislands = PolySorting.FindAreaGroupingsD(jdgeos); 
    
    $("#readingcancel").text("oriented islands"); 
    for (var j = 0; j < cboundislands.length; j++) {
        var lres = [ ]; 
        var cboundisland = cboundislands[j]; 
        for (var ci = 0; ci < cboundisland.length; ci++) {
            var i = cboundisland[ci]; 
            var jdgeo = jdgeos[i]; 
            var bfore = PolySorting.FindPathOrientation(jdgeo); 
            var jdseq = (((ci == 0) == bfore) ? jdseqs[i] : PolySorting.RevJDseq(jdseqs[i])); 
            lres.push(jdseq); 
        }
        lres.push([ ]); // the slot for the list of singlet paths
        res.push(lres); 
    }
    
    $("#readingcancel").text("singlets to groupings"); 
    for (var i = 0; i < singletslist.length; i++) {
        var ic = singletslist[i]; 
        var dpath = dlist[ic]; 
        var j = PolySorting.SingletsToGroupingsD(dpath, cboundislands, jdgeos); 
        if (j != -1)
            res[j][res[j].length-1].push(ic); 
    }

    console.log("resres", res); 
    return res; 
}

SVGfileprocess.prototype.processimportedSVG = function()
{
    var closedist = 3.2; 
    var pathgroupings = ProcessToPathGroupings(this.rlistb, closedist); // just lists of indexes into rlistb
    $("#readingcancel").text("done ProcessToPathGroupings"); 

    // rebuild this groupings directly from the above indexing sets
    var dlist = [ ]; 
    for (var i = 0; i < this.rlistb.length; i++) 
        dlist.push(this.rlistb[i].path.attrs.path); 

// should save these into objects to be passed between documents
    var rlistb = this.rlistb; 
    $.each(pathgroupings, function(i, pathgrouping) {
        // form the area object
        var dgroup = [ ]; 
        for (var j = 0; j < pathgrouping.length - 1; j++) {
            dgroup = dgroup.concat(PolySorting.JDgeoseq(pathgrouping[j], dlist)); 
        }
        var pgroup = paper1.path(dgroup); 
        pgroup.attr({stroke:"white", fill:"#0f0", "fill-opacity":"10%"}); 
        
        // form the list of all paths belonging to this area object
        var lpaths = [ pgroup ]; 
        var engpaths = pathgrouping[pathgrouping.length - 1]; 
        for (var i = 0; i < engpaths.length; i++)
            lpaths.push(rlistb[engpaths[i]].path); 
        for (var j = 0; j < pathgrouping.length - 1; j++) {
            for (var i = 0; i < pathgrouping[j].length; i++)
                lpaths.push(rlistb[pathgrouping[j][i]/2|0].path); 
        }
        
        var brotatemode = false; 
        var cx = 0, cy = 0; 
        pgroup.drag(
            function(dx, dy) { 
                var tstr = (brotatemode ? "r"+(dx*0.5)+","+cx+","+cy : "t"+(dx*paper1scale)+","+(dy*paper1scale)); 
                $.each(lpaths, function(i, path) { 
                    path.transform(tstr); 
                }); 
            }, 
            function(x, y, e)  { 
                brotatemode = e.ctrlKey; 
                pathselected = pgroup; 
                var bbox = pgroup.getBBox(); 
                cx = (bbox.x + bbox.x2)/2; 
                cy = (bbox.y + bbox.y2)/2; 
            }, 
            function() { 
                $.each(lpaths, function(i, path) { 
                    path.attr("path", Raphael.mapPath(path.attr("path"), path.matrix)); 
                    path.transform("t0,0") 
                }); 
            }
        ); 
    }); 
}



