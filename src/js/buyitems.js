/*服务费*/
var fee_rate = 0.05;

/*格式转换*/
function toMoneyStyle(money){
	var f_x = parseFloat(money, 10);
	return Math.round(f_x * 100) / 100;
}

/*Item Modal*/
var ItemModel = Backbone.Model.extend({
	defaults: function(){
		return {
			"Name"      : "",               // 商品名
			"Href" 		: "",     			// 商品链接
			"Picture" 	: "",     			// 商品主图片
			"chicun" 	: "",     			// 商品尺寸
			"yanse" 	: "",     			// 商品颜色
			"ShopName"  : "",     			// 卖家
			"ShopHref"  : "",     			// 卖家url
			"Price" 	: 0,     			// 商品价格
			"BuyNum" 	: 1,     			// 购买数量
			"Freight" 	: 0,     			// 运费
			"Serverfee" : 0,                // 服务费
			"Totalfee"  : 0,                // 总费用
			"itemid"	: items.itemId()    // 标识
		}
	},
	/*抓取一条数据*/
	crawlOne: function(url){
		url = $.trim(url);

		if (url.length <= 0 || url == "http://") {
			App.returnDefault("Please enter product url first.");
			return;
		}
		if (url.indexOf("http://") < 0 && url.indexOf("https://") < 0){
			url = "http://" + url;
		}
		var i = new RegExp("http(s)?://([\\w-]+\\.)+[\\w-]+(/[\\w- ./?%&=]*)?");
		if (!i.test(url)){
			App.returnDefault("Sorry, your product url is illegal.");
			return;
		}		
		if($.trim(url) == '' || (url.indexOf('taobao.com') == -1 && url.indexOf('tmall.com') == -1)){
			App.returnDefault('Please enter taobao/tmall product url.');
			return;
		}

		var that   = this;
		$.ajax({
			type: 		'post',
			url: 		'/cssbuy/ajax/fast_ajax.php',
			dataType: 	'json',
			data:       {'url': url, 'action': 'get'},
			success:    function(json){
				if(!json || !json.d){
					App.returnDefault('Failed to get item info, please fill item info yourself.');
					return;
				}

				var d = json.d,
					serverfee = toMoneyStyle(d.Price * d.BuyNum * fee_rate),
					totalfee  = toMoneyStyle(parseFloat(d.Price * d.BuyNum, 10) + parseFloat(serverfee, 10) + parseFloat(d.Freight, 10)),
					itemData = {
						"Name": 	 d.Name,
						"Href": 	 d.Href,
						"Picture":   d.Picture,
						"ShopName":  d.Shop.Name,
						"ShopHref":  d.Shop.Href,
						"Price": 	 toMoneyStyle(d.Price),
						"Freight":   toMoneyStyle(d.Freight),
						"Serverfee": serverfee,
						"Totalfee":  totalfee
					};

				that.set(itemData);

				var view  = new ItemView({model: that}),
					_item = view.render().$el;

				App.$('#itemlist').prepend(_item.fadeIn('slow'));
				items.add(that);
				App.render();
				App.returnDefault().hideOthers();
			}
		});
	}
});
/*Statistic Model*/
var StatisticModel = Backbone.Model.extend({
	totalprice:   0,
	totalfreight: 0,
	totalfee:     0,
	total:        0
});
var statistic = new StatisticModel();

/*Collection*/
var ItemCollection = Backbone.Collection.extend({
	model: ItemModel,
	itemId: function(){
		if (!this.length) return 1;
      	return this.last().get('order') + 1;
	}
});
var items = new ItemCollection();

/*Statistic View*/
var StatisticView = Backbone.View.extend({
	el:       $('#statistic-list'),
	template: _.template($('#statistic-template').html()),
	render:   function(){
		this.$el.html(this.template(statistic.toJSON()));
	}
});
var statView = new StatisticView();
/*Item View*/
var ItemView = Backbone.View.extend({
	tagName:   'div',
	className: 'item',
	template:  _.template($('#item-template').html()),
	events: {
		'click a.remove'	 	: "removeItem",
		'change input.price' 	: "reset",
		'change input.freight' 	: "reset",
		'change input.buynum'   : "reset",
		'click button.minus'    : "minusBuynum",
		'click button.plus'		: "plusBuynum",
		'click .header'         : "toggleShow"
	},
	initialize: function(){
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'destroy', this.remove);
	},
	render: function(){
		/*渲染一条*/
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},
	/*重新设置*/
	reset: function(){
		console.log('change!');
		var _price     = toMoneyStyle(this.$el.find('[name=price]').val()),
			_freight   = parseFloat(this.$el.find('[name=freight]').val(), 10),
			_buynum    = parseInt(this.$el.find('[name=buynum]').val(), 10),
			_serverfee = toMoneyStyle(_price * _buynum * fee_rate),
			_total     = toMoneyStyle(parseFloat(_price * _buynum, 10) + parseFloat(_serverfee, 10) + parseFloat(_freight, 10));

		this.model.set({
			"Price": 	 _price,
			"Freight":   _freight,
			"BuyNum":    _buynum,
			"Serverfee": _serverfee,
			"Totalfee":  _total
		});
	},
	/*删除本条*/
	removeItem: function(){
		this.model.destroy();
		App.hideOthers();
	},
	/*减*/
	minusBuynum: function(){
		var ele = this.$el.find('.buynum'),
			buynum = parseInt(ele.val(), 10) <= 1 ? 1 : (parseInt(ele.val(), 10) - 1);

		ele.val(buynum).trigger('change');
	},
	/*加*/
	plusBuynum: function(){
		var ele = this.$el.find('.buynum'),
			buynum = parseInt(ele.val(), 10) + 1;

		ele.val(buynum).trigger('change');
	},
	toggleShow: function(e){
		if(e.target.nodeName.toUpperCase() != 'DIV') return;
		
		var moreEle = this.$el.find('.more');
		if(moreEle.is(':visible')){
			moreEle.hide();
		}else{
			moreEle.show();
		}
	}
});
var AppView = Backbone.View.extend({
	el: $('#buyitems'),
	events: {
		'click button#add-one': 'addItem'
	},
	initialize: function(){
		//this.listenTo(items, 'add', this.render);
		this.listenTo(items, 'remove', this.render);
		this.listenTo(items, 'change', this.render);
	},
	render: function(){
		if(items.length > 0){
			this.$('#statistic').show();
			this.$('#statistic-tip').hide();
		}else{
			this.$('#statistic').hide();
			this.$('#statistic-tip').show();
		}

		/*计算总费用*/
		var data  = {
			totalprice   : 0,
		 	totalfreight : 0,
			totalfee     : 0,
			total 		 : 0
		};
		items.each(function(model){
			var attr     = model.attributes,
				_price   = attr.Price,
				_buynum  = attr.BuyNum,
				_freight = attr.Freight,
				_fee     = attr.Serverfee,
				_total   = attr.Totalfee; 

			data.totalprice   += _price;
			data.totalfreight += _freight;
			data.totalfee     += _fee;
			data.total        += _total;
		});
		statistic.set(data);
		statView.render();
	},
	/*添加一条*/
	addItem: function(){
		this.$('#statistic-tip').hide();
		this.$el.find('.loading').show();
		this.$('#add-one').attr({disabled: true});

		var url  = this.$('#crawl-url').val(),
			item = new ItemModel();
		
		item.crawlOne(url);
	},
	/*恢复默认操作视图*/
	returnDefault: function(msg){
		this.$el.find('#crawl-url').val('').focus();
		this.$el.find('.loading').hide();
		this.$el.find('#add-one').attr({disabled: false});
		if(msg){
			this.$el.find('#statistic-tip').show();
			this.$el.find('#statistic-tip .msg').html(msg);
		}
		return this;
	},
	/*默认只显示第一条*/
	hideOthers: function(){
		this.$el.find('.item .more').hide();
		this.$el.find('.item .more').eq(0).show();
		return this;
	}
});

var App = new AppView();

/*提示类*/
$.actiontip = function(config){
	alert(config.msg);
};