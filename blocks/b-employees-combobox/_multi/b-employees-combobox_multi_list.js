BEM.DOM.decl({
    block: 'b-employees-combobox',
    modName: 'multi',
    modVal: 'list'
}, {

    onSetMod: {
        'js': function() {
            this.__base();
        }
    },

    _updateInputStyle: function() {
        this.setMod(this.elem('item-input'), 'style',
            !this._values.length && 'default' ||
                (this._values.length % 2 == 0) && 'full' ||
                'small'
        );
    }

}, {});