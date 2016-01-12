
var SVGfileprocess = function(fname, fnum, fadivid) 
{
    this.fname = fname; 
    this.fnum = fnum; 
    this.fadivid = fadivid; 
    this.state = "constructed"; 
    this.bcancelIm = false; 
    this.dfprocessstatus = "div#"+this.fadivid+" .fprocessstatus"; 

    // after importing:
    // this.rlistb = [ ]; 
    // this.spnumlist = [ ]; 
    // this.spnummap = { }; 
    // this.btunnelxtype
}

SVGfileprocess.prototype.WorkOutPixelScale = function() 
{
    var svgtitletext = this.tsvg.find("title").text(); 
    this.btunnelxtype = (svgtitletext.match(/TunnelX/) != null); 
    if (this.btunnelxtype) 
        console.log("Detected TunnelX type"); 

    var sheight = this.tsvg.attr("height"); 
    var swidth = this.tsvg.attr("width"); 
    var viewBox = []; // (seemingly unable to lift the viewBox as an attribute)
    this.txt.replace(/viewBox="(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s+(-?\d*\.?\d*(?:e[\-+]?\d+)?)/g, 
        function(a, x, y, w, h) { 
            viewBox.push(parseFloat(x), parseFloat(y), parseFloat(w), parseFloat(h)); 
    }); 

    console.log("facts:" + swidth +"  " + sheight + "  "+viewBox); 
    var inkscapedefaultmmpix = 90/25.4; 
    this.fmmpixwidth = inkscapedefaultmmpix; 
    this.fmmpixheight = inkscapedefaultmmpix; 
    if ((viewBox.length != 0) && (sheight != undefined) && (swidth != undefined)) {
        console.assert(sheight.match(/.*?(mm|in)$/g)); 
        var fmmheight = parseFloat(sheight) * (sheight[sheight.length-1] == 'n' ? 25.4 : 1); 
        console.assert(swidth.match(/.*?(mm|in)$/g)); 
        var fmmwidth = parseFloat(swidth) * (swidth[swidth.length-1] == 'n' ? 25.4 : 1); 
        this.fmmpixwidth = viewBox[2]/fmmwidth; 
        this.fmmpixheight = viewBox[3]/fmmheight; 
    }
    // force all to be same scale
    this.fsca = inkscapedefaultmmpix/this.fmmpixwidth; 
    this.mmpixwidth = inkscapedefaultmmpix
    
    console.log("pixscaleX "+this.mmpixwidth+"  pixscaleY "+this.mmpixheight); 
    $("#mmpixwidth").val(this.mmpixwidth); 
    $("#mmpixwidth").change(); 
}

SVGfileprocess.prototype.processSingleSVGpathFinal = function(dtrans, bMsplits, d, spnum, strokecolour, strokewidth, cmatrix)
{
    var i0 = 0; 
    var mi = 0; 
    while (i0 < dtrans.length) {
        var i1 = i0 + 1; 
        while ((i1 < dtrans.length) && (dtrans[i1][0] != "M"))
            i1++; 
        // this is the place to separate out the paths by M positions
        var path = paper1.path(dtrans.slice(i0, i1)); 
        path.attr({stroke:strokecolour, "stroke-width":strokewidth}); 
        rlist.push(path); 
        this.rlistb.push({path:path, spnum:spnum, d:d, mi:mi, cmatrix:cmatrix}); 
        
        i0 = i1; 
        mi++; 
    }
}
    
SVGfileprocess.prototype.processSingleSVGpath = function(d, cmatrix, stroke, cc)
{
    var dtrans = Raphael.mapPath(d, cmatrix); // Raphael.transformPath(d, raphtranslist.join("")); 
    if (dtrans.length <= 1)
        return; 

    var cclass; 
    if ((stroke == "none") || (stroke === undefined)) 
        return; 
    cclass = stroke; 
    
    // convert all to extended classes with these strokes in?
    if (this.spnummap[cclass] === undefined) {
        var strokecolour = stroke; 
        var spnumobj = { spnum:this.spnumlist.length, strokecolour:strokecolour }; 
        var stitle = strokecolour; 
        this.spnummap[cclass] = spnumobj.spnum; 
        this.spnumlist.push(spnumobj); 
        if (true) {
            $('div#'+this.fadivid+' .spnumcols').append($('<span class="spnum'+spnumobj.spnum+'" title="'+stitle+'">'+('X')+'</span>').css("background", strokecolour)); 
            $('div#'+this.fadivid+' .spnumcols span.spnum'+spnumobj.spnum).click(function() {
                if ($(this).hasClass("selected")) 
                    $(this).removeClass("selected"); 
                else
                    $(this).addClass("selected"); 
            });
        }
    }
    var spnum = this.spnummap[cclass]; 
    var spnumobj = this.spnumlist[spnum]; 
    var strokecolour = spnumobj.strokecolour; 
    this.processSingleSVGpathFinal(dtrans, true, d, spnum, strokecolour, 2.0, cmatrix); 
}


SVGfileprocess.prototype.importSVGpathR = function() 
{
    while (this.cstack.length == this.pback.pos) 
        this.pback = this.pstack.pop(); 
    if (this.cstack.length == 0) {
        return false; 
    }
    var cc = this.cstack.pop(); 
    var tag = cc.prop("tagName").toLowerCase(); 
    var raphtranslist = this.pback.raphtranslist; 
    var cmatrix = this.pback.cmatrix; 
    if (cc.attr("transform")) {
        raphtranslist = raphtranslist.slice(); 
        raphtranslist.push(cc.attr("transform").replace(/([mtrs])\w+\s*\(([^\)]*)\)/gi, function(a, b, c) { return b.toLowerCase()+c+(b.match(/s/i) ? ",0,0" : ""); } )); 
        cmatrix = paper1.path().transform(raphtranslist.join("")).matrix; 
    }
    var strokelist = this.pback.strokelist; 

    // decode case where multiple classes in same field
    var cclass = cc.attr("class"); 
    var cstroke = cc.attr("stroke") || cc.css("stroke"); 
    if (!cstroke && cclass) {
        var lcclasss = cclass.split(" "); 
        for (var k = 0; k < lcclasss.length; k++) { 
            var lcclass = lcclasss[k]; 
            if (lcclass) {
                var lstroke = this.mclassstyle[lcclass] && this.mclassstyle[lcclass]["stroke"]; 
                var lfill = this.mclassstyle[lcclass] && this.mclassstyle[lcclass]["fill"]; 
                cstroke = lstroke || cstroke || lfill;  // prioritized getting colour from somewhere
            }
        }
    }
    
    if (cstroke) {
        strokelist = strokelist.slice(); 
        strokelist.push(cstroke); 
    } else {
        cstroke = strokelist[strokelist.length - 1]; 
    }
    if (tag == "pattern") {
        console.log("skip pattern"); 
    } else if (tag == "clippath") {
        console.log("skip clippath"); // will deploy Raphael.pathIntersection(path1, path2) eventually
        // <clipPath id="cp1"> <path d="M497.7 285.2 Z"/></clipPath>
        // then clippath="url(#cp1)" in a path for a trimmed symbol type
    } else if ((tag == "polygon") || (tag == "polygline")) {
        var ppts = cc.attr("points").split(/\s+|,/);
        var x0 = ppts.shift(); 
        var y0 = ppts.shift();
        var d = 'M'+x0+','+y0+'L'+ppts.join(' ')+(tag == "polygon" ? "Z" : ""); 
        this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "circle") {
        var cx = parseFloat(cc.attr("cx"));
        var cy = parseFloat(cc.attr("cy")); 
        var r = parseFloat(cc.attr("r")); 
        var d = "M"+(cx-r)+","+cy+"A"+r+","+r+",0,0,1,"+cx+","+(cy-r)+"A"+r+","+r+",0,1,1,"+(cx-r)+","+cy; 
        this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "line") {
        var x1 = parseFloat(cc.attr("x1"));
        var y1 = parseFloat(cc.attr("y1")); 
        var x2 = parseFloat(cc.attr("x2"));
        var y2 = parseFloat(cc.attr("y2")); 
        var d = "M"+x1+","+y1+"L"+x2+","+y2; 
        this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "rect") {
        var x0 = parseFloat(cc.attr("x"));
        var y0 = parseFloat(cc.attr("y")); 
        var x1 = x0 + parseFloat(cc.attr("width")); 
        var y1 = y0 + parseFloat(cc.attr("height")); 
        var d = "M"+x0+","+y0+"L"+x0+","+y1+" "+x1+","+y1+" "+x1+","+y0+"Z"; 
        if (!this.btunnelxtype)
            this.processSingleSVGpath(d, cmatrix, cstroke, cc); 
    } else if (tag == "path") {
        this.processSingleSVGpath(cc.attr("d"), cmatrix, cstroke, cc); 
    } else {
        this.pstack.push(this.pback); 
        this.pback = { pos:this.cstack.length, raphtranslist:raphtranslist, strokelist:strokelist, cmatrix:cmatrix }; 
        var cs = cc.children(); 
        for (var i = cs.length - 1; i >= 0; i--) 
            this.cstack.push($(cs[i]));   // in reverse order for the stack
    }
    $(this.dfprocessstatus).text(this.rlistb.length+"/"+this.cstack.length); 
    return true; 
}



SVGfileprocess.prototype.spnummapGetCreate = function(cclass, mcs, strokecolour)
{
    // convert all to extended classes with these strokes in?
    if (this.spnummap[cclass] === undefined) {
        var fillcolour = Raphael.getColor(1.0); 
        var spnumobj = { spnum:this.spnumlist.length, strokecolour:strokecolour, fillcolour:fillcolour, subsetname:mcs.dsubsetname, linestyle:mcs.dlinestyle }; 
        var stitle = spnumobj.subsetname+"-"+spnumobj.linestyle; 
        this.spnummap[cclass] = spnumobj.spnum; 
        this.spnumlist.push(spnumobj); 
        if (spnumobj.linestyle == "Wall") {
            $('div#'+this.fadivid+' .spnumcols').append($('<span class="spnum'+spnumobj.spnum+'" title="'+stitle+'">'+('X')+'</span>').css("background", fillcolour||strokecolour)); 
            $('div#'+this.fadivid+' .spnumcols span.spnum'+spnumobj.spnum).click(function() {
                if ($(this).hasClass("selected")) 
                    $(this).removeClass("selected"); 
                else
                    $(this).addClass("selected"); 
            });
        }
    }
}

SVGfileprocess.prototype.processSingleSVGpathTunnelx = function(d, stroke, cc)
{
    var dtrans = Raphael.path2curve(d);
    var cclass = cc.attr("class"); 
    var mcs = this.mclassstyle[cclass]; 
    var dlinestyle = mcs.dlinestyle; 
    this.spnummapGetCreate(cclass, mcs, stroke); 
    
    if (this.state == "importsvgrareas") {
        if (mcs.dlinestyle === undefined) {
            console.log(cclass); 
            return; 
        } else if (mcs.dlinestyle.match("subsetarea") == null) {
            return; 
        }
    } else if (this.state == "detailsloading") {
        if (mcs.dlinestyle == undefined) 
            return; // this is due to a label arrow!
        if (mcs.dlinestyle.match("OSA|CCA|subsetarea") != null)
            return; 
    }
    
    // convert all to extended classes with these strokes in?
    var spnum = this.spnummap[cclass]; 
    var spnumobj = this.spnumlist[spnum]; 
    var strokecolour = spnumobj.strokecolour; 
    if (this.state == "importsvgrareas") 
        strokecolour = spnumobj.fillcolour; 
    var bMsplits = (mcs.dlinestyle.match(/symb/) != null); 
    this.processSingleSVGpathFinal(dtrans, bMsplits, d, spnum, strokecolour, 1.0, null); 
}


// simplified of importSVGpathR
SVGfileprocess.prototype.importSVGpathRtunnelx = function() 
{
    while (this.cstack.length == this.pback.pos) 
        this.pback = this.pstack.pop(); 
    if (this.cstack.length == 0) 
        return false; 
    var cc = this.cstack.pop(); 
    var tag = cc.prop("tagName").toLowerCase(); 
    console.assert(cc.attr("transform") == null); 

    if (tag == "clippath") {
        console.log("skip clippath"); // will deploy Raphael.pathIntersection(path1, path2) eventually
        // <clipPath id="cp1"> <path d="M497.7 285.2 Z"/></clipPath>
        // then clippath="url(#cp1)" in a path for a trimmed symbol type
    } else if (tag == "path") {
        var cclass = cc.attr("class"); 
        var cstroke = this.mclassstyle[cclass]["stroke"]; 
        this.processSingleSVGpathTunnelx(cc.attr("d"), cstroke, cc); 
    } else {
        this.pstack.push(this.pback); 
        this.pback = { pos:this.cstack.length }; 
        var cs = cc.children(); 
        for (var i = cs.length - 1; i >= 0; i--) 
            this.cstack.push($(cs[i]));   // in reverse order for the stack
    }
    $(this.dfprocessstatus).text(this.rlistb.length+"/"+this.cstack.length); 
    return true; 
}

// this operates the settimeout loop
function importSVGpathRR(lthis)  
{
    if (lthis.bcancelIm) {
        $(this.dfprocessstatus).text("CANCELLED"); 
        lthis.state = "cancelled"+lthis.state; 
    } else if (lthis.btunnelxtype ? lthis.importSVGpathRtunnelx() : lthis.importSVGpathR()) {
        setTimeout(importSVGpathRR, lthis.timeoutcyclems, lthis); 
    } else {
        lthis.state = "done"+lthis.state; // "importsvgrareas" : "importsvgr"
        if (lthis.state == "donedetailsloading")
            lthis.processdetailSVGtunnelx(); 
        else if (lthis.btunnelxtype || $("div#"+lthis.fadivid+" .groupprocess").hasClass("selected"))
            lthis.processimportedSVG(); 
    }
}



SVGfileprocess.prototype.InitiateLoadingProcess = function(txt) 
{
    // NB "stroke" actually means colour in SVG lingo
    this.state = "loading"; 
    this.txt = txt; 
    this.tsvg = $($(txt).children()[0]).parent(); // seems not to work directly as $(txt).find("svg")
    this.WorkOutPixelScale();  // sets the btunnelxtype

    this.mclassstyle = { }; 
    var mclassstyle = this.mclassstyle; 
    this.tsvg.find("style").text().replace(/\.([\w\d\-]+)\s*\{([^}]*)/gi, function(a, b, c) { 
        mclassstyle[b] = { }; 
        c.replace(/([^:;]*):([^:;]*)/gi, function(a1, b1, c1) { 
            var c11 = c1.trim(); 
            if ((c11.length != 0) && (c11[0] == '"') && (c11[c11.length-1] == '"'))
                c11 = c11.slice(1, -1); 
            mclassstyle[b][b1.trim().toLowerCase()] = c11; 
        }); 
    }); 
    console.log(mclassstyle); 

    // autorun the group process (should distinguish easy cases)
    if (txt.length < 10000)
        $("div#"+this.fadivid+" .groupprocess").addClass("selected"); 

    this.rlistb = [ ]; 
    this.spnumlist = [ ]; 
    this.spnummap = { }; // maps into the above from concatinations of subset and strokecolour

    // these control the loop importSVGpathRR runs within
    this.pback = {pos:-1, raphtranslist:[""], strokelist:[undefined], cmatrix:Raphael.matrix(this.fsca, 0, 0, this.fsca, 0, 0) };
    this.pstack = [ ]; 
    this.cstack = [ this.tsvg ]; 
    
    this.state = (this.btunnelxtype ? "importsvgrareas" : "importsvgr"); 
    this.timeoutcyclems = 4; 
    importSVGpathRR(this); 
}

SVGfileprocess.prototype.DetailsLoadingProcessTunnelx = function() 
{
    console.assert(this.btunnelxtype); 
    this.state = "detailsloading"; 

    this.pback = {pos:-1, raphtranslist:[""], strokelist:[undefined], cmatrix:Raphael.matrix(this.fsca, 0, 0, this.fsca, 0, 0) };
    this.pstack = [ ]; 
    this.cstack = [ this.tsvg ]; 
    importSVGpathRR(this); 
}


// this could still break into totally disconnected contours with islands that don't overlap
// (but that's for later when we are even trimming the symbols)
function ProcessToPathGroupingsTunnelX(rlistb, spnumlist)
{
    var subsetnamemaps = { }; 
    for (var i = 0; i < rlistb.length; i++) {
        var spnumobj = spnumlist[rlistb[i].spnum]; 
        if (spnumobj.linestyle == "subsetarea") {
            var subsetname = spnumobj.subsetname; 
            if (subsetnamemaps[subsetname] === undefined) 
                subsetnamemaps[subsetname] = [ subsetname ]; 
            subsetnamemaps[subsetname].push([i*2+1]); 
        }
    }

    var subsetnames = Object.keys(subsetnamemaps); 
    res = [ ]; 
    for (var i = 0; i < subsetnames.length; i++) {
        var lres = subsetnamemaps[subsetnames[i]]; 
        lres.push([]); // the list of engraving edges
        res.push(lres); 
    }

    // engraving edge groups
    for (var i = 0; i < rlistb.length; i++) {
        var spnumobj = spnumlist[rlistb[i].spnum]; 
        if (spnumobj.linestyle != "subsetarea") {
            var subsetname = spnumobj.subsetname; 
            if (subsetnamemaps[subsetname] !== undefined) 
                subsetnamemaps[subsetname][subsetnamemaps[subsetname].length-1].push(i); 
        }
    }

    console.log("resresX", res); 
    return res; 
}

function ProcessToPathGroupings(rlistb, closedist, spnumscp)
{
    // form the closed path sequences per spnum
    var jdseqs = [ ];  // indexes dlist
    for (var ispnum = 0; ispnum < spnumscp.length; ispnum++) {
        var spnum = spnumscp[ispnum]; 
        $(this.dfprocessstatus).text("joining spnum="+spnum); 
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
    $(this.dfprocessstatus).text("getsingletlist"); 
    var singletslist = PolySorting.GetSingletsList(jdseqs, dlist.length)

    // build the dlist without any holes parallel to rlistb to use for groupings
    var dlist = [ ]; 
    for (var i = 0; i < rlistb.length; i++) 
        dlist.push(rlistb[i].path.attrs.path); 
    $(this.dfprocessstatus).text("concat JDgeoseqs"); 
    var jdgeos = [ ]; 
    for (var i = 0; i < jdseqs.length; i++) {
        jdgeos.push(PolySorting.JDgeoseq(jdseqs[i], dlist)); // concatenated sequences of paths forming the boundaries
    }

    // groups of jdsequences forming outercontour, islands, singlets 
    $(this.dfprocessstatus).text("FindAreaGroupingsD"); 
    var res = [ ]; 
    var cboundislands = PolySorting.FindAreaGroupingsD(jdgeos); 
    
    $(this.dfprocessstatus).text("oriented islands"); 
    for (var j = 0; j < cboundislands.length; j++) {
        var lres = [ "cb"+j ]; 
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
    
    $(this.dfprocessstatus).text("singlets to groupings"); 
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


SVGfileprocess.prototype.processdetailSVGtunnelx = function()
{
    var subsetnamemapsI = { }; 
    for (var i = 0; i < this.pathgroupings.length; i++) {
        subsetnamemapsI[this.pathgroupings[i][0]] = i; 
        console.assert(this.pathgroupings[i][this.pathgroupings[i].length-1].length == 0); 
    }
    
    var rlistb = this.rlistb; 
    var spnumlist = this.spnumlist; 
    // engraving edge groups
    for (var j = 0; j < rlistb.length; j++) {
        var spnumobj = spnumlist[rlistb[j].spnum]; 
        if (spnumobj.linestyle != "subsetarea") {
            var subsetname = spnumobj.subsetname; 
            var i = subsetnamemapsI[subsetname]; 
            if (i !== undefined) {
                this.pathgroupings[i][this.pathgroupings[i].length-1].push(j); 
                var pgroup = this.Lgrouppaths[i][0]; 
                rlistb[j].path.transform(pgroup.matrix.toTransformString()); 
                this.Lgrouppaths[i].push(rlistb[j].path); 
            }
        }
    }
    
    this.state = "done"+this.state; 
}

SVGfileprocess.prototype.processimportedSVG = function()
{
    // could this be converted into a callback
    var closedist = 3.2; 

    var spnumscp = [ ]; 
    $('div#'+this.fadivid+' .spnumcols span').each(function(i, v)  { 
        if (!$(v).hasClass("selected"))
            spnumscp.push(parseInt($(v).attr("class").match(/\d+/g)[0]));  // spnum(\d+) 
    }); 
    console.log("hghghg", spnumscp); 
    
    // lists of indexes into rlistb specifying the linked boundaries and islands (*2+(bfore?1:0)), and engraving lines in the last list
    if (this.btunnelxtype)
        this.pathgroupings = ProcessToPathGroupingsTunnelX(this.rlistb, this.spnumlist); 
    else
        this.pathgroupings = ProcessToPathGroupings(this.rlistb, closedist, spnumscp); 
    
    this.state = "process"+this.state.slice(4); 
    $(this.dfprocessstatus).text("doneG"); 

    // rebuild this groupings directly from the above indexing sets
    var dlist = [ ]; 
    for (var i = 0; i < this.rlistb.length; i++) 
        dlist.push(this.rlistb[i].path.attrs.path); 

    this.Lgrouppaths = [ ]; 
    for (var k = 0; k < this.pathgroupings.length; k++) {
        var pathgrouping = this.pathgroupings[k]; 
        
        // form the area object
        var dgroup = [ ]; 
        var fillcolour = (this.btunnelxtype ? this.spnumlist[this.rlistb[pathgrouping[1][0]/2|0].spnum].fillcolour : "#0f0"); 
        for (var j = 1; j < pathgrouping.length - 1; j++) {
            dgroup = dgroup.concat(PolySorting.JDgeoseq(pathgrouping[j], dlist)); 
        }
        var pgroup = paper1.path(dgroup); 
        pgroup.attr({stroke:(this.btunnelxtype ? "black" : "white"), fill:fillcolour, "fill-opacity":"10%"}); 
        
        // form the list of all paths belonging to this area object
        var lpaths = [ pgroup ]; 
        for (var j = 1; j < pathgrouping.length - 1; j++) {
            for (var i = 0; i < pathgrouping[j].length; i++) {
                lpaths.push(this.rlistb[pathgrouping[j][i]/2|0].path); 
            }
        }
        var engpaths = pathgrouping[pathgrouping.length - 1]; 
        for (var i = 0; i < engpaths.length; i++)
            lpaths.push(this.rlistb[engpaths[i]].path); 
        this.Lgrouppaths.push(lpaths); 
        // localize for drag function
        (function(pgroup, lpaths) {
            var brotatemode = false; 
            var cx = 0, cy = 0; 
            var basematrix; 
            pgroup.drag(
                function(dx, dy) { 
                    var tstr = (brotatemode ? "r"+(dx*0.5)+","+cx+","+cy : "t"+(dx*paper1scale)+","+(dy*paper1scale))+basematrix; 
                    for (var k = 0; k < lpaths.length; k++) {
                        lpaths[k].transform(tstr); 
                    }; 
                }, 
                function(x, y, e)  { 
                    brotatemode = e.ctrlKey; 
                    pathselected = pgroup; 
                    basematrix = pgroup.matrix.toTransformString(); 
                    var bbox = pgroup.getBBox(); 
                    cx = (bbox.x + bbox.x2)/2; 
                    cy = (bbox.y + bbox.y2)/2; 
                }, 
                function() { 
                    /*$.each(lpaths, function(i, path) { 
                        path.attr("path", Raphael.mapPath(path.attr("path"), path.matrix)); 
                        path.transform("t0,0") 
                    });*/ 
                }
            ); 
        })(pgroup, lpaths); 
    }; 
}

