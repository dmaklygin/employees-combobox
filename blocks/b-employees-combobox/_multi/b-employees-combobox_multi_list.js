BEM.DOM.decl({
    block: 'b-employees-combobox',
    modName: 'multi',
    modVal: 'list'
}, {

    onSetMod: {
        'js': function() {

            this.params = $.extend({
                smallPlaceholder: 'Add'
            }, this.params);

            this.__base();
        }
    },

    onElemSetMod: {
        input: {
            status: function(input, modName, modVal) {
                input.attr('placeholder', modVal === 'active' ?
                    this.params.activePlaceholder :
                    (['small', 'full'].indexOf(this.getMod(this.elem('item-input'), 'style')) !== -1 ?
                        this.params.smallPlaceholder :
                        this.params.defaultPlaceholder
                    )
                );
            }
        }
    },

    _initEvents: function() {
        this.__base();

        this
            .bindTo('item-input', 'mouseover', function() {
                this.setMod(this.elem('item-input'), 'hover', 'yes');
            })
            .bindTo('item-input', 'mouseout', function() {
                this.setMod(this.elem('item-input'), 'hover', 'no');
            });

    },

    _updateInputStyle: function() {
        this.setMod(this.elem('item-input'), 'style',
            !this._values.length && 'default' ||
                (this._values.length % 2 == 0) && 'full' ||
                'small'
        );
    }

}, {});