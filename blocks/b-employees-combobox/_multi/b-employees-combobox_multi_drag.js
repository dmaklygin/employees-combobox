BEM.DOM.decl({
        block: 'b-employees-combobox',
        modName: 'multi',
        modVal: 'drag'
    }, {

    onSetMod: {

        'js': function() {

            this.__base();

            this.elem('selected-items').sortable({
                items: 'li:not(.b-employees-combobox__item-input)', //@todo Необходимо получить имя блока от куда-то...
                update: $.proxy(this.afterSorting, this)
            });
        }

    },

    afterSorting: function (event, ui) {

        var _this = this,
            values = [];

        this.findElem('selected-item').each(function (index, node) {
            values.push(_this.getSelectedItemId(node));
        });

        this._values = values;

        this.elem('value').val(this._values.join(','));

        this.trigger('change');
    }

});