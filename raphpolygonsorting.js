
PolySorting = {

FindPathOrientation: function(darea)
{
    var iL = 0; 
    for (var i = 1; i < darea.length; i++) {
        if (darea[i][darea[i].length - 2] < darea[iL][darea[iL].length - 2]) {
            iL = i; 
        }
    }
    var x = darea[iL][darea[iL].length - 2]; 
    var y = darea[iL][darea[iL].length - 1]; 
    var xf, yf, xb, yb; 
    var iF = iL + 1; 
    while (iF != iL) {
        if (iF == darea.length) {
            iF = 0; 
            if (iF == iL)
                break; 
        }
        xF = darea[iF][darea[iF].length - 2]; 
        yF = darea[iF][darea[iF].length - 1]; 
        if ((xF != x) || (yF != y))
            break; 
        iF++; 
    }
    var iB = iL - 1; 
    while (iB != iL) {
        if (iB == -1) {
            iB = darea.length - 1; 
            if (iB == iL)
                break; 
        }
        xB = darea[iB][darea[iB].length - 2]; 
        yB = darea[iB][darea[iB].length - 1]; 
        if ((xB != x) || (yB != y))
            break; 
        iB--; 
    }
        
    var vxF = xF - x;  
    var vyF = yF - y;  
    console.assert(vxF >= 0.0, vxF); 
    var diamondF = vyF / (Math.abs(vyF) + vxF); 
    var vxB = xB - x;  
    var vyB = yB - y;  
    console.assert(vxB >= 0.0, vxB); 
    var diamondB = vyB / (Math.abs(vyB) + vxB); 
    return diamondB <= diamondF; 
},


FindClosedPathSequencesD: function(dlist, closedist)
{
    // create arrays of closest links
    var closedistSq = closedist*closedist; 
    var rlends = [ ]; // [ x, y, i, bfore ]
    var rlidat = [ ]; // index*2 front back
    Drlends = rlends; 
    Drlidat = rlidat; 
    for (var i = 0; i < dlist.length; i++) {
        rlidat.push([ ], [ ]); // each will be a list of cross connections [d, j]
        var pseq = dlist[i]; 
        if (pseq) {
            var seg0 = pseq[0]; 
            rlends.push([ seg0[1], seg0[2], i, false ]); 
            var segE = pseq[pseq.length - 1]; 
            rlends.push([ segE[segE.length-2], segE[segE.length-1], i, true ]); 
        }
    } 
    rlends.sort(); 
    
    var rlconns = 0; 
    for (var j = 0; j < rlends.length - 1; j++) {
        var rle = rlends[j]; 
        var xB = rle[0]; 
        var yB = rle[1]; 
        var jd = rle[2]*2 + (rle[3] ? 1 : 0); 
        for (var j1 = j+1; ((j1 < rlends.length) && (rlends[j1][0] <= xB + closedist)); j1++) {
            var rle1 = rlends[j1]; 
            var dx = rle1[0] - xB;
            var dy = rle1[1] - yB; 
            var dCsq = dx*dx + dy*dy; 
            if (dCsq <= closedistSq) {
                var jd1 = rle1[2]*2 + (rle1[3] ? 1 : 0); 
                rlidat[jd].push([dCsq, jd1]); 
                rlidat[jd1].push([dCsq, jd]); 
                rlconns++; 
            }
        }
    }

    // sort adjacencies at endpoints by distance
    for (var j = 0; j < rlidat.length - 1; j++) {
        rlidat[j].sort(); 
    }

    function disconnectJD1(jd, jd1) {
        var rlid1 = rlidat[jd1]; 
        //console.log("disconjd", jd, jd1, rlid1.slice()); 
        var d1i; 
        for (d1i = rlid1.length - 1; d1i >= 0; d1i--) {
            if (rlid1[d1i][1] == jd)
                break; 
        }
        for (++d1i ; d1i < rlid1.length; d1i++)
            rlid1[d1i-1] = rlid1[d1i]; 
        rlid1.pop(); 
    }
    
    // extract closed sequences of paths that join up
    var jdseqs = [ ];  
    var i = 0; 
    var Dloops = rlconns*2 + dlist.length; 
    while (i < dlist.length) {
        console.assert(Dloops-- >= 0); 
        if (rlidat[i*2].length == 0) {
            if (rlidat[i*2 + 1].length == 0) {
                i++; 
            } else {
                var jd = i*2 + 1; 
                while (rlidat[jd].length != 0) {
                    disconnectJD1(jd, rlidat[jd].pop()[1]); 
                }
            }
        } else if (rlidat[i*2 + 1].length == 0) {
            var jd = i*2; 
            while (rlidat[jd].length != 0) {
                disconnectJD1(jd, rlidat[jd].pop()[1]); 
            }
        } else {
            var jdseq = [ ]; 
            var jd0 = i*2 + 1; 
            var jd = jd0; 
            while (true) {
                if (rlidat[jd].length == 0) {
                    var jdl = jdseq.pop(); 
                    //console.log("removing jdl", jdl, jd0); 
                    disconnectJD1(jdl, rlidat[jdl].shift()[1]); 
                    break; 
                } else if (jdseq.length > dlist.length - i*0) {
                    //console.log("removing jd0 semiloop", jd0); 
                    disconnectJD1(jd0, rlidat[jd0].shift()[1]); 
                    break; 
                } else {
                    jdseq.push(jd); 
                    var jd1 = rlidat[jd][0][1];
                    jd = jd1 + ((jd1%2) == 1 ? -1 : 1); 
                    if (jd == jd0) 
                        break; 
                }
            }
            if (jd == jd0) {
                //console.log("found cycle", jdseq); 
                jdseqs.push(jdseq); 
                for (var ijd = 0; ijd < jdseq.length; ijd++) {
                    var jd = jdseq[ijd]; 
                    while (rlidat[jd].length != 0) {
                        disconnectJD1(jd, rlidat[jd].pop()[1]); 
                    }
                    jd1 = jd + ((jd%2) == 1 ? -1 : 1); 
                    while (rlidat[jd1].length != 0) {
                        disconnectJD1(jd1, rlidat[jd1].pop()[1]); 
                    }
                }
                i++; 
            } 
        }
    }
    return jdseqs; 
},

GetSingletsList: function(jdseqs, dlistlength)
{
    var singletslistNm = { }; 
    for (var i = 0; i < jdseqs.length; i++) {
        var jdseq = jdseqs[i]; 
        for (var j = 0; j < jdseq.length; j++) {
            singletslistNm[jdseq[j]/2|0] = 1; 
        }
    }
    var singletslist = [ ]; 
    for (var i = 0; i < dlistlength; i++) {
        if (singletslistNm[i] === undefined) {
            singletslist.push(i); 
        }
    }
    return singletslist; 
},

dpathappendsegs: function(darea, dpath, breversed) 
{
    if (breversed) {
        for (var k = dpath.length - 1; k > 0; k--) {
            var lseq0 = dpath[k-1]; 
            var lseq1 = dpath[k]; 
            var nseq = [ lseq1[0] ]; 
            for (var l = lseq1.length - 4; l > 0; l -= 2)
                nseq.push(lseq1[l], lseq1[l + 1]); 
            nseq.push(lseq0[lseq0.length - 2], lseq0[lseq0.length - 1]); 
            darea.push(nseq); 
        }
    } else {
        for (var k = 1; k < dpath.length; k++) 
            darea.push(dpath[k]); 
    }
},

RevJDseq: function(jdseq)
{
    var res = [ ]; 
    for (var i = jdseq.length - 1; i >= 0; i--) {
        var jd = jdseq[i]; 
        res.push(jd + ((jd%2)==1 ? -1 : 1)); 
    }
    return res; 
},

JDgeoseq: function(jdseq, dlist)
{
    var darea = [ ]; 
    for (var ijd = 0; ijd < jdseq.length; ijd++) {
        var jd = jdseq[ijd]; 
        var i = jd/2|0; 
        var bfore = ((jd%2)==1); 
        var spath = dlist[i]; 
        console.assert(spath[0][0] == "M"); 
        var px, py; 
        if (bfore) {
            if (ijd == 0) {
                darea.push(spath[0]); 
            } else if ((px != spath[0][1]) || (py != spath[0][2])) {
                darea.push(["L", spath[0][1], spath[0][2]]); 
            }
            this.dpathappendsegs(darea, spath, false); 
            var lseq = spath[spath.length-1]; 
            px = lseq[lseq.length - 2]; 
            py = lseq[lseq.length - 1]; 
        } else {
            var lseq = spath[spath.length-1]; 
            if (ijd == 0) {
                darea.push(["M", lseq[lseq.length - 2], lseq[lseq.length - 1]]); 
            } else if ((px != lseq[lseq.length - 2]) || (py != lseq[lseq.length - 1])) {
                darea.push(["L", lseq[lseq.length - 2], lseq[lseq.length - 1]]); 
            }
            this.dpathappendsegs(darea, spath, true); 
            px = spath[0][1]; 
            py = spath[0][2]; 
        }
    }
    console.assert(darea[0][0] == "M"); 
    if ((px != spath[0][1]) || (py != spath[0][2])) {
        darea.push(["L", darea[0][1], darea[0][2]]); 
    }
    return darea; 
},


FindAreaGroupingsD: function(jdgeos)
{
    var nsampspercurve = 3; 
    var nsampspercurveDecider = 2; // work on contour points because using actual inner points gives false positives if mishandled
    var cycsamplepts = [ ]; 
    for (var ic = 0; ic < jdgeos.length; ic++) {
        var jdgeo = jdgeos[ic]; 
        var samplepts = [ Raphael.pathBBox(jdgeo) ]; 
        var tl = Raphael.getTotalLength(jdgeo); 
        for (var i = 0; i < nsampspercurve; i++) {
            var pal = Raphael.getPointAtLength(jdgeo, tl*i/nsampspercurve); 
            samplepts.push(pal); 
        }
        cycsamplepts.push(samplepts); 
    }

    // find insidedness
    var continnerpairs = [ ]; 
    for (var ic0 = 0; ic0 < jdgeos.length - 1; ic0++) {
        var jdgeo0 = jdgeos[ic0]; 
        var cycsamplepts0 = cycsamplepts[ic0]
        for (var ic1 = ic0+1; ic1 < jdgeos.length; ic1++) {
            var jdgeo1 = jdgeos[ic1]; 
            var cycsamplepts1 = cycsamplepts[ic1]
            if (Raphael.isBBoxIntersect(cycsamplepts0[0], cycsamplepts1[0])) {
                var si0 = 0, si1 = 0; 
                for (var i = 1; i <= nsampspercurve; i++) {
                    //var pt1m = [["M", cycsamplepts1[i].x, cycsamplepts1[i].y], ["H", cycsamplepts1[0].x2 + 10]]; 
                    //var pt0m = [["M", cycsamplepts0[i].x, cycsamplepts0[i].y], ["H", cycsamplepts0[0].x2 + 10]]; 
                    //var ni0 = Raphael.pathIntersectionNumber(jdgeo0, pt1m); 
                    //var ni1 = Raphael.pathIntersectionNumber(jdgeo1.darea, pt0m); 
                    si0 += (Raphael.isPointInsidePath(jdgeo0, cycsamplepts1[i].x, cycsamplepts1[i].y) ? 1 : 0); 
                    si1 += (Raphael.isPointInsidePath(jdgeo1, cycsamplepts0[i].x, cycsamplepts0[i].y) ? 1 : 0); 
                }

                if ((si0 >= nsampspercurveDecider) && (si1 < nsampspercurveDecider))
                    continnerpairs.push([ic1, ic0]); 
                else if ((si0 < nsampspercurveDecider) && (si1 >= nsampspercurveDecider))
                    continnerpairs.push([ic0, ic1]); 
                else if ((si0 >= nsampspercurveDecider) && (si1 >= nsampspercurveDecider))
                    console.log("overlapping", ic0, ic1, "si", si0, si1); 
            }
        }
    }

    // containment sets
    var mapsdown = { }; 
    var mapsup = { }; 
    for (var ic = 0; ic < jdgeos.length; ic++) {
        mapsdown[ic] = [ ]; 
        mapsup[ic] = [ ]; 
    }
    for (var i = 0; i < continnerpairs.length; i++) {
        var ic0 = continnerpairs[i][0]; 
        var ic1 = continnerpairs[i][1]; 
        mapsdown[ic1].push(ic0); 
        mapsup[ic0].push(ic1); 
    }

    var mapsdown1 = { }; 
    for (var ic = 0; ic < jdgeos.length; ic++) {
        var md = mapsdown[ic]; 
        var md2 = [ ]; 
        for (var i = 0; i < md.length; i++) {
            var md11 = mapsdown[md[i]]; 
            for (var j = 0; j < md11.length; j++) {
                md2.push(md11[j]); 
            }
        }
        var md1 = [ ]; 
        for (var i = 0; i < md.length; i++) {
            if (!md2.includes(md[i])) {
                md1.push(md[i]); 
            }
        }
        mapsdown1[ic] = md1; 
    }
    
    // work down the tree
    //console.log("mapsdown", mapsdown); 
    //console.log("mapsdown1", mapsdown1); 
    //console.log(mapsup); 
    var outerlevels = [ ]; 
    for (var ic = 0; ic < jdgeos.length; ic++) {
        if (mapsup[ic].length == 0) {
            outerlevels.push(ic); 
        }
    }
    var cboundislands = [ ]; 
    while ((outerlevels.length != 0) && (cboundislands.length < jdgeos.length + 10)) {
        var ic = outerlevels.shift(); 
        var cboundisland = [ ic ]; 
        var md1 = mapsdown1[ic]; 
        for (var i = 0; i < md1.length; i++) {
            cboundisland.push(md1[i]); 
            var md1i1 = mapsdown1[md1[i]]; 
            for (var j = 0; j < md1i1.length; j++) {
                outerlevels.push(md1i1[j]); 
            }
        }
        cboundislands.push(cboundisland); 
        console.assert(cboundislands.length <= jdgeos.length); 
    }
    return cboundislands; 
},

SingletsToGroupingsD: function(dpath, cboundislands, jdgeos)
{
    var lamchecks = [ 0.5, 0.1, 0.9, 0.7, 0.33233432 ]; 
    var tl = Raphael.getTotalLength(dpath); 
    var il = 0; 
    var Jb = -1; 
    while (il < lamchecks.length) {
        var pt = Raphael.getPointAtLength(dpath, tl*lamchecks[il]); 
        var Js = [ ]; 
        for (var j = 0; j < cboundislands.length; j++) {
            var cboundisland = cboundislands[j]; 
            var k; 
            for (k = 0; k < cboundisland.length; k++) {
                if (Raphael.isPointInsidePath(jdgeos[cboundisland[k]], pt.x, pt.y) != (k == 0))
                    break; 
            }
            if (k == cboundisland.length)
                Js.push(j); 
        }
        
        if (Js.length == 1) {
            Jb = Js[0]; 
            break; 
        }
        if (Js.length != 0)
            Jb = Js[0]; 
        il++; 
    }
    return Jb; 
}
}

