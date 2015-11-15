// I don't like to pollute the global namespace 
// but I can't get this to work any other way.
var eventcache = {};

function E(e){
	
	function matchSelector(e,selector){
		var result = false;
		// Does this one element match the selector
		if(selector[0] == '.'){
			selector = selector.substr(1);
			for(var i = 0; i < e.classList.length; i++) if(e.classList[i] == selector) return true;
		}else if(selector[0] == '#'){
			if(e.id == selector.substr(1)) return true;
		}else{
			if(e.tagName == selector.substr(1).toUpperCase()) return true;
		}
		return false;
	}
	function getBy(e,selector){
		var i = -1;
		var result = new Array();
		if(selector.indexOf(':eq') > 0){
			var m = selector.replace(/(.*)\:eq\(([0-9]+)\)/,'$1 $2').split(" ");
			selector = m[0];
			i = parseInt(m[1]);
		}
		if(selector[0] == '.') els = e.getElementsByClassName(selector.substr(1));
		else if(selector[0] == '#') els = e.getElementById(selector.substr(1));
		else els = e.getElementsByTagName(selector);
		if(!els) els = [];
		if(typeof els.length!=="number") els = [els];
		for(k = 0; k < els.length; k++){ result.push(els[k]); }
		if(i >= 0 && result.length > 0){
			if(i < result.length) result = [result[i]];
			else result = [];
		}
		return result;
	}

	// Make our own fake, tiny, version of jQuery simulating the parts we need
	function stuQuery(els){
		if(typeof els==="string"){
			var a,els,els2,i,j,k,tmp;
			a = els.split(' ');
			for(i = 0; i < a.length; i++){
				if(i==0){
					els = getBy(document,a[i]);
				}else{
					els2 = new Array();
					for(j = 0; j < els.length; j++) els2 = els2.concat(getBy(els[j],a[i]));
					els = els2.splice(0);
				}
			}
		}
		this.e = [];
		if(!els) return this;
		if(typeof els.length!=="number") els = [els];
		this.e = els;
		return this;
	}
	stuQuery.prototype.ready = function(f){ /in/.test(document.readyState)?setTimeout('E(document).ready('+f+')',9):f() }
	// Return HTML or set the HTML
	stuQuery.prototype.html = function(html){
		if(!html && this.e.length == 1) return this.e[0].innerHTML;
		if(html) for(var i = 0; i < this.e.length; i++) this.e[i].innerHTML = html;
		return this;
	}
	stuQuery.prototype.setCache = function(a){
		eventcache = a;
		return;
	}
	function NodeMatch(a,el){
		if(a && a.length > 0){
			for(var i = 0; i < a.length; i++){
				if(a[i].node == el) return {'success':true,'match':i};
			}
		}
		return {'success':false};
	}
	function storeEvents(e,event,fn,fn2,data){
		if(!eventcache[event]) eventcache[event] = new Array();
		eventcache[event].push({'node':e,'fn':fn,'fn2':fn2,'data':data});
	}
	function getEvent(e){
		if(eventcache[e.type]){
			var m = NodeMatch(eventcache[e.type],e.currentTarget);
			if(m.success){
				if(m.match.data) e.data = eventcache[e.type][m.match].data;
				return {'fn':eventcache[e.type][m.match].fn,'data':e};
			}
		}
		return function(){ return {'fn':''}; }
	}
	// Try to remove an event with attached data and supplied function, fn.
	stuQuery.prototype.off = function(event){

		// If the remove function doesn't exist, we make it
		if(typeof Element.prototype.removeEventListener !== "function"){
			Element.prototype.removeEventListener = function (sEventType, fListener /*, useCapture (will be ignored!) */) {
				if (!oListeners.hasOwnProperty(sEventType)) { return; }
				var oEvtListeners = oListeners[sEventType];
				for (var nElIdx = -1, iElId = 0; iElId < oEvtListeners.aEls.length; iElId++) {
					if (oEvtListeners.aEls[iElId] === this) { nElIdx = iElId; break; }
				}
				if (nElIdx === -1) { return; }
				for (var iLstId = 0, aElListeners = oEvtListeners.aEvts[nElIdx]; iLstId < aElListeners.length; iLstId++) {
					if (aElListeners[iLstId] === fListener) { aElListeners.splice(iLstId, 1); }
				}
			}
		}
		for(var i = 0; i < this.e.length; i++){
			var m = NodeMatch(eventcache[event],this.e[i]);
			if(m.success){
				this.e[i].removeEventListener(event,eventcache[event][m.match].fn2,false);
				eventcache[event].splice(m.match,1);
			}
		}
		return this;
	}
	// Add events
	stuQuery.prototype.on = function(event,data,fn){
		event = event || window.event; // For IE
		this.cache = [4,5,6];
		if(typeof data==="function" && !fn){
			fn = data;
			data = "";
		}
		if(typeof fn !== "function") return this;

		if(this.e.length > 0){
			var _obj = this;
			var a = function(b){
				var e = getEvent({'currentTarget':this,'type':event,'data':data,'originalEvent':b});
				if(typeof e.fn === "function") return e.fn.call(_obj,e.data);
			}
		
			for(var i = 0; i < this.e.length; i++){
				storeEvents(this.e[i],event,fn,a,data);
				if(this.e[i].addEventListener) this.e[i].addEventListener(event, a, false); 
				else if(this.e[i].attachEvent) this.e[i].attachEvent(event, a);
			}
		}
		return this;
	}
	stuQuery.prototype.trigger = function(e){
		var event; // The custom event that will be created

		if (document.createEvent) {
			event = document.createEvent("HTMLEvents");
			event.initEvent(e, true, true);
		} else {
			event = document.createEventObject();
			event.eventType = e;
		}

		event.eventName = e;

		for(var i = 0 ;  i < this.e.length ; i++){
			if (document.createEvent) this.e[i].dispatchEvent(event);
			else this.e[i].fireEvent("on" + event.eventType, event);
		}

		return this;
	}
	// Remove DOM elements
	stuQuery.prototype.remove = function(){
		if(!this.e) return this;
		for(var i = this.e.length-1; i >= 0; i--){
			if(!this.e[i]) return;
			if(typeof this.e[i].remove==="function") this.e[i].remove(this.e[i]);
			else if(typeof this.e[i].parentElement.removeChild==="function") this.e[i].parentElement.removeChild(this.e[i]);
		}
		return this;
	}
	// Check if a DOM element has the specified class
	stuQuery.prototype.hasClass = function(cls){
		var result = true;
		for(var i = 0; i < this.e.length; i++){
			if(!this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) result = false;
		}
		return result;
	}
	// Toggle a class on a DOM element
	stuQuery.prototype.toggleClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			if(this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = this.e[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'');
			else this.e[i].className = (this.e[i].className+' '+cls).replace(/^ /,'');
		}
		return this;
	}
	// Toggle a class on a DOM element
	stuQuery.prototype.addClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			if(!this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = (this.e[i].className+' '+cls).replace(/^ /,'');
		}
		return this;
	}
	// Remove a class on a DOM element
	stuQuery.prototype.removeClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			if(this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = this.e[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'');
		}
		return this;
	}
	stuQuery.prototype.css = function(css){
		var style = '';
		for(key in css){
			if(style) style += ';';
			style += key+':'+css[key];
		}
		for(var i = 0; i < this.e.length; i++){
			this.e[i].setAttribute('style',style);
		}
		return this;
	}
	stuQuery.prototype.parent = function(){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++) tmp.push(this.e[i].parentElement);
		return E(tmp);
	}
	// Only look one level down
	stuQuery.prototype.children = function(c){
		if(typeof c==="string"){
			// We are using a selector
			var result = [];
			for(var i = 0; i < this.e.length; i++){
				for(var ch = 0; ch < this.e[i].children.length; ch++){
					if(matchSelector(this.e[i].children[ch],c)) result.push(this.e[i].children[ch]);
				}
			}
			return E(result);
		}else{
			// We are using an index
			for(var i = 0; i < this.e.length; i++) this.e[i] = (this.e[i].children.length > c ? this.e[i].children[c] : this.e[i]);
			return E(this.e);
		}
	}
	stuQuery.prototype.find = function(selector){
		var tmp = [];
		var result = [];
		for(var i = 0; i < this.e.length; i++){
			tmp = getBy(this.e[i],selector);
			for(k = 0; k < tmp.length; k++){ result.push(tmp[k]); }
		}
		// Return a new instance of stuQuery
		return E(result);
	}
	stuQuery.prototype.attr = function(attr,val){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++){
			tmp.push(this.e[i].getAttribute(attr));
			if(typeof val==="string") this.e[i].setAttribute(attr,val)
		}
		if(tmp.length==1) tmp = tmp[0];
		return tmp;
	}
	stuQuery.prototype.prop = function(attr,val){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++){
			tmp.push(this.e[i].getAttribute(attr));
			if(typeof val==="boolean"){
				if(val) this.e[i].setAttribute(attr,attr);
				else this.e[i].removeAttribute(attr);
			}
		}
		if(tmp.length==1) tmp = tmp[0];
		return tmp;
	}
	stuQuery.prototype.clone = function(){
		var target = this.e[0];
		var wrap = document.createElement('div');
		wrap.appendChild(target.cloneNode(true));
		return wrap.innerHTML;
	}
	stuQuery.prototype.replaceWith = function(html){
		var myAnchor = this.e[0];
		var mySpan = document.createElement("span");
		mySpan.innerHTML = html;
		this.e[0].parentNode.replaceChild(mySpan, this.e[0]);
  		return this;
	}
	stuQuery.prototype.loadJSON = function(file,fn,attrs){

		if(!attrs) attrs = {};
		attrs['_file'] = file;

		var httpRequest = new XMLHttpRequest();
		httpRequest.onreadystatechange = function() {
			if (httpRequest.readyState === 4) {
				if (httpRequest.status === 200) {
					var data = JSON.parse(httpRequest.responseText);
					if(typeof fn==="function") fn.call((attrs['this'] ? attrs['this'] : this),data,attrs);
				}else{
					console.log('error loading '+file)
					if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),httpRequest.responseText,attrs);
				}
			}
		};
		httpRequest.open('GET', file);
		httpRequest.send(); 
		return this;
	}
	return new stuQuery(e);
}



function RocketScientist(){
	this.z = {};
	this.choices = {};
	this.wide = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	this.tall = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

	this.getSections();
	E().loadJSON('config/en_advanced_options.json',this.init,{'this':this});

	return this;
}
RocketScientist.prototype.getSections = function(){
	var s = E('section');
	this.sections = [];
	this.navigable = {};
	for(var i = 0 ;i < s.e.length; i++){
		var el = E(s.e[i]);
		if(el.hasClass('view')){
			var id = el.attr('id');
			this.sections.push(id);
			this.navigable[id] = false;
		}
	}
	// Make first section navigable
	this.navigable[this.sections[0]] = true;
	this.has = {};
	this.has['vw'] = (E('#progressbar').css({'width':'100vw'}).e[0].offsetWidth==this.wide);

	return this;
}
RocketScientist.prototype.init = function(data){

	this.data = data;
	var _obj = this;


	// Remove elements that show noscript messages
	E('.noscriptmsg').remove();

	// Remove classes from script only elements
	E('.scriptonly').toggleClass('scriptonly');

	// We hide elements that shouldn't be visible (but we are leaving visible
	// in the plain HTML so there is something if Javascript doesn't work.
	for(var s = 0; s < this.sections.length; s++) E('#'+this.sections[s]).css({'position':'absolute','top':0,'left':(s>0 ? '100%':'0')});

	// Deal with button presses in the type section
	E('#type button').on('click',{me:this},function(e){ _obj.setType(E(e.currentTarget).attr('data-type')); });
	
	// Deal with button presses in the goal section
	E('#goal button').on('click',{me:this},function(e){ _obj.setGoal(E(e.currentTarget).attr('data-goal')); });
	
	// Add events to size selection buttons
	E('#bus .satellite').on('click',{me:this},function(e){
		E(e.currentTarget).parent().find('button').trigger('click');
	});
	E('#bus button').on('click',{me:this},function(e){
		e.data.me.setBus(e.currentTarget,E(e.currentTarget).attr('data-size'));
	});
	
	// Replace the default behaviour of the navigation links
	E('.prev a').on('click',{me:this},function(e){ e.data.me.navigate(e); });
	E('.next a').on('click',{me:this},function(e){ e.data.me.navigate(e); }).addClass('disabled');


	// Add buttons
	E('.list-bar').html('<button class="fancy add">&plus;</button><button class="fancy remove" disabled="disabled">&minus;</button>');

	// Add events to add/remove buttons
	var _obj;
	
	this.makeSatelliteControls('#satellite');
	this.makeSatelliteControls('#satellite-power');

	// Add buttons for power list
	var plus = E('#power_list button').on('click',{me:'test'},function(e){ _obj.addPowerPackage.call(_obj,e); });

	// We'll need to change the sizes when the window changes size
	window.addEventListener('resize', function(event){ _obj.resize(); });
	this.resize();

	// Quickly set and unset the type to reset the vertical scroll
	this.setType('EO').setType('');

	// Remove the overlay we've added inline
	E('#overlay').remove();

	return this;
}
RocketScientist.prototype.allowNavigateBeyond = function(t){
	var found = false;
	for(var i = 0; i < this.sections.length; i++){
		if(!found){
			E('#'+this.sections[i]+' .next a').removeClass('disabled');
		}else{
			E('#'+this.sections[i]+' .next a').addClass('disabled');
		}
		if(this.sections[i]==t && i < this.sections.length-1){
			found = true;
			this.navigable[this.sections[i+1]] = true;
		}
	}
	if(!t){
		// If we didn't get provided a section, we reset everything
		for(var i = 0; i < this.sections.length; i++){
			this.navigable[this.sections[i]] = (i > 0 ? false : true);
			E('#'+this.sections[i]+' .next a').addClass('disabled');
		}
	}
	return this;
}
RocketScientist.prototype.setType = function(t){
	this.choices['type'] = t;

	// Reset any existing selection
	E('#type button').removeClass('selected');

	if(t){
		// Select this button
		E('#type .'+t+' button').addClass('selected');

		// Update what is displayed in the goals section
		for(s in this.data.scenarios){
			if(t==s) E('#goal .'+s).css('');
			else E('#goal .'+s).css({'display':'none'});
		}
		// Reset any goals
		this.choices['goal'] = "";
		E('#goal button').removeClass('selected');
	
		this.allowNavigateBeyond('type');
	}else{
		this.allowNavigateBeyond('');
	}
	return this;
}
RocketScientist.prototype.setGoal = function(g){
	this.choices['goal'] = parseInt(g);

	// Reset any existing selection
	E('#goal button').removeClass('selected');

	// Select this button
	E(E('#goal .'+this.choices.type+' button').e[this.choices.goal]).addClass('selected');

	// If this goal comes with a size, we set that
	console.log('Would set the size for beginner level')

	this.choices.mission = this.data.scenarios[this.choices.type].missions[this.choices.goal];
	// Update the budget
	console.log('Update the displayed budget')
	E('#bar .togglecost .cost').html(this.choices.mission.budget.value)

	// Update what is displayed in the instrument requirements
	console.log('Update the instrument requirements')

	this.allowNavigateBeyond('goal');
	return this;
}
// Choose the bus size
RocketScientist.prototype.setBus = function(btn,element){
	var sat = E('#bus .satellite-'+element[0]);

	// Reset all to black and white
	E('#bus .holder').addClass('blackandwhite');
	// Remove existing selections
	E('#bus .selected').removeClass('selected');

	// Update satellite section with choice
	var html = sat.clone();
	E('#satellite .satellite').replaceWith(html)
	E('#satellite-power .satellite').replaceWith(html)

	sat.addClass("selected").parent().removeClass("blackandwhite");
	E(btn).addClass('selected');
	this.allowNavigateBeyond('bus');
	return this;
}
RocketScientist.prototype.navigate = function(e){
	e.originalEvent.preventDefault();
	var href = E(e.currentTarget).attr('href');
	var section = href.substr(1);
	if(this.navigable[section]){
		var found = false;
		var progress = 0;
		for(var i = 0 ; i < this.sections.length; i++){
			if(section==this.sections[i]){
				progress = 100*i/this.sections.length;
				found = true;
				E(href).css({'position':'absolute','top':'0','left':'0'});
			}else{
				if(!found) E('#'+this.sections[i]).css({'position':'absolute','top':'0','left':'-100%'});
				else E('#'+this.sections[i]).css({'position':'absolute','top':'0','left':'100%'});
			}
		}
		E('#progressbar .progress-inner').css({'width':progress.toFixed(1)+'%'});
	}
	
	return false;
}
RocketScientist.prototype.makeSatelliteControls = function(selector){

	this.z[selector] = {'z':1,'el':E(selector)};
	
	// Create controls for satellite power view
	var zc = this.z[selector].el.find('.zoomcontrol');
	zc.children('.zoomin').on('click',{me:this,by:1.1,z:selector},function(e){ e.data.me.zoom(e.data.z,e.data.by); });
	zc.children('.zoomout').on('click',{me:this,by:1/1.1,z:selector},function(e){ e.data.me.zoom(e.data.z,e.data.by); });
	zc.children('.make3D').on('click',{me:this,by:1/1.1,z:selector},function(e){ e.data.me.toggle3D(e.data.z); });
	zc.children('.animate').on('click',{me:this,by:1/1.1,z:selector},function(e){ e.data.me.toggleAnimation(e.data.z); });

	return this;
}
RocketScientist.prototype.zoom = function(selector,factor){
	if(this.z[selector].z * factor < 2 && this.z[selector].z * factor > 0.5) this.z[selector].z *= factor;
	this.z[selector].el.css({'font-size':this.z[selector].z.toFixed(3)+'em'});
	return this;
}
RocketScientist.prototype.toggle3D = function(element){
	E(element).toggleClass('threeD');
	return this;
}
RocketScientist.prototype.toggleAnimation = function(element){
	E(element+' .satellite').toggleClass('spin');
	return this;
}
RocketScientist.prototype.addPowerPackage = function(e){
	var a = E(e.currentTarget);
	var add = a.hasClass('add') ? true : false;
	var type = a.parent().parent().attr('data-package');
	if(type=="solar-panel") this.solarPanel(add,e);
	else if(type=="solar-panel-surface") this.solarFixed(add,e);

	return this;
}
// Add or remove deployable solar panels up to a maximum
RocketScientist.prototype.solarPanel = function(add,e){
	var panels,ps;
	var parent = E(e.currentTarget).parent();
	var a = parent.children('.add');
	var m = parent.children('.remove');
	var max = 8;
	if(add){
		panels = E('#sat-power .solar-panels');
		for(var i = 0; i < panels.e.length; i++){
			ps = panels.e[i].getElementsByTagName('li');
			if(ps.length < 4) panels.e[i].getElementsByTagName('ol')[0].innerHTML += '<li class="solar-panel"><\/li>';
		}
	}else{
		E('#sat-power .solar-panels li:eq(0)').remove();
		if(E('#sat-power .solar-panels li').e.length==0) m.prop('disabled',true);
	}
	// Find out how many panels we have
	ps = E('#sat-power .solar-panels li');
	if(ps.e.length >= max){
		// If we've reached the maximum number we hide the add button
		a.prop('disabled',true);
		m.prop('disabled',false);
	}else if(ps.e.length==0){
		m.prop('disabled',true);
	}else{
		a.prop('disabled',false);
		m.prop('disabled',false);
	}
	return this;
}
// Toggle the fixed solar panels
RocketScientist.prototype.solarFixed = function(add,e){
	var parent = E(e.currentTarget).parent();
	var p = parent.children('.add');
	var m = parent.children('.remove');
	if(add){
		E('#sat-power .satellite').addClass('solar-fixed');
		p.prop('disabled',true);
		m.prop('disabled',false);
	}else{
		E('#sat-power .satellite').removeClass('solar-fixed');
		p.prop('disabled',false);
		m.prop('disabled',true);
	}
	return this;
}
// Resize function called when window resizes
RocketScientist.prototype.resize = function(){

	// Kludgy fix for old browsers that don't have vw/vh/flex in CSS
	if(!this.has.vw){
		function height(el){
			if('getComputedStyle' in window) return parseInt(window.getComputedStyle(el, null).getPropertyValue('height'));
			else return parseInt(document.getElementById('example').currentStyle.height);	
		}
		function resize(){
			E('section').css({'min-height':this.tall+'px'});
			var paddh = tall-128;			// Hard-coded fudge based on padding
			E('section').children('.padded').css({'min-height':paddh+'px'});
			var table = E('section').children('.padded').children('.table');
			table.css({'height':paddh+'px'});
			var rows = table.children('.table-row');

			for(var r = 0; r < rows.e.length; r++){
				// Step up to the table parent
				table = E(rows.e[r]).parent();
				var fixed = table.children('.table-row-top');
				var rs = table.children('.table-row');
				var dh = paddh-height(fixed.e[0]);
				var dr = rs.e.length;
				if(dr <= 0) dr = 1;
				E(rows.e[r]).css({'height':(dh/dr)+'px','overflow':'hidden'}).find('.list').css({'height':(dh)+'px'});
				var req = E(rows.e[r]).find('.requirements');
				if(req.e.length > 0){
					E(rows.e[r]).find('.satellite-holder').css({'height':(dh-height(req.e[0]))+'px'});
				}
			}
		}
	}
	return this;
}

function toggleComms(){
	var slots = [{'el':'sat','cls':'slot4x8','type':'north no-inside'},{'el':'sat','cls':'normal','type':'south'}];
	var el,radio,cls,i,i2,e;
	for(var s = 0; s < slots.length; s++){
		e = E('#'+slots[s].el+' .'+slots[s].cls+':eq(0)');
		if(e.e.length > 0){
			if(E(e.e[0]).hasClass('radio')) E('#'+slots[s].el+' .hemisphere').remove();
			else e.html('<div class="hemisphere '+slots[s].type+'"><div class="inner"><\/div><div class="dome"><\/div><\/div>'+e.html());
			e.toggleClass('radio').toggleClass('slot-empty');
		}
	}
	e = E('#sat .slot0x2:eq(0)');
	if(e.e.length > 0){
		if(e.hasClass('antenna')) E('#sat .aerial').remove();
		else E('#sat .slot0x2:eq(0) .top:eq(0)').html("<div class=\"aerial1 aerial\"><\/div><div class=\"aerial2 aerial\"><\/div>");
		e.toggleClass('antenna').toggleClass('slot-empty');
	}
}

var rs;
// On load
E(document).ready(function(){
	rs = new RocketScientist();
});

function test(){
	// Quick start
	// Trigger selection
	E('#type .NAV button').trigger('click');
	E('#type nav a').trigger('click');
	E('#goal .NAV button:eq(1)').trigger('click');
	E('#goal nav a:eq(1)').trigger('click');
	E('#bus .satellite-l').trigger('click');
	E('#bus nav a:eq(1)').trigger('click');

}