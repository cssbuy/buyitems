/*服务费*/
var fee_rate = 0.05;

/*格式转换*/
function toMoneyStyle(money){
	var f_x = parseFloat(money, 10);
	return Math.round(f_x * 100) / 100;
}

/*提示类*/
$.popup = function(config){
    var _config = {
        type:     'info',     //弹框类型
        msg:      '',         //文字内容
        btnText:  'Close',    //按钮文字
        callback: null,       //点击按钮回调函数
        showBtn:  true        //是否显示按钮
    };
    config = $.extend(_config, config);

    var iconArr = {
        'info':    'glyphicon glyphicon-exclamation-sign',
        'error':   'glyphicon glyphicon-remove-sign',
        'success': 'glyphicon glyphicon-ok-sign'
    };

    //创建遮罩层
    var popup_mask = $('#popup_mask');
    if(popup_mask.size() == 0){
        popup_mask = $('<div id="popup_mask"></div>').appendTo('body');
    }
    popup_mask.show();

    if($('#popup_box').size() > 0) $('#popup_box').remove();

    var pop_box;
    if(config.showBtn){
        pop_box = $('<div id="popup_box" class="' + config.type + '"><span class="' + iconArr[config.type] + '"></span><p>' + config.msg + '</p><input type="button" class="btn btn-border" id="popup_btn" value="' + config.btnText + '" /></div>').appendTo('body');
    }else{
        pop_box = $('<div id="popup_box" class="' + config.type + '"><span class="' + iconArr[config.type] + '"></span><p>' + config.msg + '</p></div>').appendTo('body');
    }

    pop_box.find('.btn').click(function(){
        pop_box.remove();
        popup_mask.hide();
        if(config.callback) config.callback();
    });
};

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
            "Type"      : 0,                // 1表示buy yourself；默认为0
            "Expressno" : "",               // 追踪号
            "Note"      : "",               // Note
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
					_item = view.render().$el,
                    _item.attr('data-itemid', 'item_' + that.get('itemid'));

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
      	return this.length + 1;
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
		'click a.remove'	 	 : "removeItem",
		'change input.price' 	 : "reset",
		'change input.freight' 	 : "reset",
		'change input.buynum'    : "reset",
		'click button.minus'     : "minusBuynum",
		'click button.plus'		 : "plusBuynum",
		'click .header'          : "toggleShow",
        'click .buyyourself-btn' : "buyyourself",
        'change .color'          : "reset",
        'change .size'           : "reset",
        'change .expressno'      : "reset"
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
		var _color     = $.trim(this.$el.find('.color').val()),
            _size      = $.trim(this.$el.find('.size')),
            _type      = this.$el.find('.buyyourself-btn').is(':checked') ? 1 : 0,
            _expressno = $.trim(this.$el.find('.expressno').val()),
            _price     = toMoneyStyle(this.$el.find('[name=price]').val()),
			_freight   = parseFloat(this.$el.find('[name=freight]').val(), 10),
			_buynum    = parseInt(this.$el.find('[name=buynum]').val(), 10),
			_serverfee = toMoneyStyle(_price * _buynum * fee_rate),
			_total     = toMoneyStyle(parseFloat(_price * _buynum, 10) + parseFloat(_serverfee, 10) + parseFloat(_freight, 10));

		this.model.set({
            "yanse":     _color,
            "chicun":    _size,
            "Type":      _type,
            "expressno": _expressno,
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
	},
    buyyourself: function(){
        var ele = this.$('.buyyourself-btn');
        if(ele.is(':checked')){
            this.$('.popover').show().find('.expressno').focus();
        }else{
            this.$('.popover').hide();
        }
    }
});
var AppView = Backbone.View.extend({
	el: $('#buyitems'),
	events: {
		'click button#add-one':         'addItem',
        'keyup #crawl-url':             'listenInput',
        'click button#add-to-cart-btn': 'addToCart'
	},
	initialize: function(){
		//this.listenTo(items, 'add', this.render);
		this.listenTo(items, 'remove', this.render);
		this.listenTo(items, 'change', this.render);
	},
    listenInput: function(e){
        if(e.keyCode == 13){
            this.addItem();
        }
    },
	render: function(){
		if(items.length > 0){
			this.$('#statistic').show();
			this.$('#statistic-tip').fadeOut('slow');
		}else{
			this.$('#statistic').hide();
			this.$('#statistic-tip').fadeIn('slow');
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

        data.totalprice   = toMoneyStyle(data.totalprice);
        data.totalfreight = toMoneyStyle(data.totalfreight);
        data.totalfee     = toMoneyStyle(data.totalfee);
        data.total        = toMoneyStyle(data.total);

		statistic.set(data);
		statView.render();
	},
	/*添加一条*/
	addItem: function(){
		this.$('#statistic-tip').hide();
		$('#loading').show();
		this.$('#add-one').attr({disabled: true});

		var url  = this.$('#crawl-url').val(),
			item = new ItemModel();
		
		item.crawlOne(url);
	},
	/*恢复默认操作视图*/
	returnDefault: function(msg){
		this.$el.find('#crawl-url').val('').focus();
		$('#loading').hide();
		this.$el.find('#add-one').attr({disabled: false});
		if(msg){
			this.$el.find('#statistic-tip').show();
			this.$el.find('#statistic-tip .msg').html(msg);
		}
		return this;
	},
	/*默认只显示第一条*/
	hideOthers: function(){
		this.$el.find('.item .more').filter(':visible').not(':first').slideUp();
		this.$el.find('.item .more').eq(0).show();
		return this;
	},
    /*添加到购物车*/
    addToCart: function(){
        var data = items.toJSON();
        if(data.length < 1){
            $.popup({
                msg:  'Please add an item first.',
                type: 'info'
            });
            return;
        }

        $('#loading').show();

        $.ajax({
            type:     "POST",
            url:      "/cssbuy/ajax/fast_ajax.php?action=addItems",
            dataType: "json",
            data:     {
                items: data
            },
            timeout : 10000,
            success : function(json){
                $('#loading').hide();

                if(!json){
                    $.popup({
                        msg:  'Failed to add items to shopping cart. Please try again.',
                        type: 'error'
                    });
                    return;
                }else{
                    var count = 0;
                    $.each(json, function(k, v){
                        var index  = v.index;
                        var status = v.status;
                        if(status == 0){
                            count ++;

                        }else{

                        }
                    });

                    if(count > 0){
                        $.popup({
                            msg:     count + ' items have added to your <a href="/shoppingcart.php" title="My Shopping Cart">shopping cart</a>.',
                            type:    'success'
                        });
                    }else{
                        $.popup({
                            msg:  'Failed to add items to shopping cart. Please try again.',
                            type: 'info'
                        });
                    }
                }
            }
        });
    }
});

var App = new AppView();
