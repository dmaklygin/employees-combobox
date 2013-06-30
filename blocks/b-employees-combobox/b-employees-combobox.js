BEM.DOM.decl('b-employees-combobox', {

    onSetMod: {

        'js': function() {
            this._data = this.params.data;

            var employees = this._employees = [],
                _this = this;

            $.each(this._data, function(nc, company) {
                $.each(company.departments, function(nd, dep) {
                    $.each(dep.employees, function(ne, emp) { employees.push(emp) });
                });
            });

            this._input = this.elem('input');
            this._suggest = this.elem('suggest');

            this._isMulti = this.hasMod('multi');

            this._values = this._input.val().split(',').filter(function(val) { return !!val; });

            this._val = this._input.val();

            this._current = 0;

            this._currentCompanyId = this._data[0].id;

            this._preventHide = false;

            this.on('change', this._refreshSuggest);

            this
                .bindTo(this._input, 'blur', function() {
                      this.afterCurrentEvent(function() { _this._hideSuggest() });
                })

                .bindTo('dropdown', 'mousedown', function() {
                    this._preventHide = true;
                })

                .bindTo(this._input, 'keypress', function(e) {
                    if (e.keyCode == 13) {
                        _this.selectEmployee(_this.getMod(_this.findElem('employee', 'select', 'yes'), 'id'));

                        _this._hideSuggest();

                        _this._isMulti && _this._input.blur();
                    }
                })

                .bindTo(this._input, 'keydown', function(e) {
                    switch (e.keyCode)
                    {
                        case 40:
                            _this._moveCursor('down');
                            break;
                        case 38:
                            _this._moveCursor('up');
                            break;
                        default:
                            this._showSuggest();
                    }
                });

            // @todo зачем интервал здесь?
            setInterval(function() { _this.inputVal(_this._input.val()) }, 200);

            this._refreshSuggest();
        }

    },

    _scrollToCurrent: function(current) {
        current || (current = this.findElem('employee').eq(this._current));

        current.length && this._suggest.scrollTop(current.position().top + this._suggest.scrollTop() - 5);

        current.length && this.__scroller.mCustomScrollbar("scrollTo", current.position().top + this._suggest.scrollTop() - 5);
    },

    _showSuggest: function(scrollOff) {

        var _this = this,
            position = this.elem('item-input').position(),
            height = this.elem('item-input').outerHeight(true);

        this.setMod(this.elem('item-input'), 'selected', 'yes');

        this.elem('dropdown')
            .css({ top: (position.top + height) + 'px' })
            .fadeIn(200, function () {
                !scrollOff && _this._scrollToCurrent();
            });
    },

    _hideSuggest: function() {
        if (this._preventHide) {
            this._preventHide = false;
            this._focus();
        } else {

            this.setMod(this.elem('item-input'), 'selected', 'no');

            this.elem('dropdown').fadeOut(200);
        }
    },

    selectEmployee: function(id) {
        if (!id) return;

        var _this = this,
            emp = this._getEmployeeById(id);

        if (!emp) return;

        if (this._isMulti) {
            if (-1 === this._values.indexOf(id))
                this._values.push(id);
            else
                return;
        } else {
            this._values = [id];
        }

        this.elem('value').val(this._values.join(','));

        this.params.onSelect && this.params.onSelect(id);

        $(this.__self.getSelectedItemHtml(emp, { isMulti: true })).insertBefore(this.elem('item-input'));

        if (!this._isMulti) {
            this.elem('item-input').hide();
        }

        this.trigger('change');

        this._hideSuggest();
    },

    removeEmployee: function(id) {

        if (this._isMulti) {
            this._values = this._values.filter(function (item) { return item != id });
        } else {
            this._values = [];
        }

        this.elem('value').val(this._values.join(','));

        this.trigger('change');
    },


    cancelSelected: function(id) {

        var _this = this;

        this.removeEmployee(id);

        this.findElem('selected-item', 'id', id).remove();

        if (!this._isMulti) {
            this.elem('item-input').show();
        }

        this._focus();
    },

    _moveCursor: function(direction) {
        var items = this.findElem('employee'),
            current = this._current,
            length = items.length;

        if (length <= 1) return;

        this.setMod(items.eq(current), 'select', 'no');
        this._current = direction == 'down' ?
            current == length - 1 ? 0 : current + 1 :
            current == 0 ? length - 1 : current - 1;

        var next = items.eq(this._current);
        var nextDep = next.parent().parent();
        // поиск не схлопнутого отдела для активного пункта
        if (this.hasMod(nextDep, 'expand', 'off')) {
            var deps = $('.b-employees-combobox__department', nextDep.parent());
            var counter = nextDep.index();

            do {
                counter = direction == 'down' ?
                    counter == deps.length - 1 ? 0 : counter + 1 :
                    counter == 0 ? deps.length - 1 : counter - 1;
            } while (this.hasMod(deps.eq(counter), 'expand', 'off') && counter != nextDep.index())

            var nextDepChild = $('.b-employees-combobox__employees-list', deps.eq(counter)).children();

            next = direction == 'down' ? nextDepChild.first() : nextDepChild.last();
            for (var i = 0, l = items.length; i < l; i++) {
                if (next[0] == items[i]) {
                    this._current = i;
                    break;
                }
            }
        } else {
            this._scrollToCurrent(next);
        }

        this.setMod(next, 'select', 'yes');
    },

    _refreshSuggest: function() {
        var _this = this,
            matched = this._getMatchedEmployee(),
            count = 0,
            company;

        $.each(matched, function(nc, company) {
            $.each(company.departments, function(nd, dep) {
                count += dep.employees.length;
            });
        });

        for (var i = 0, l = matched.length; i < l; i++) {
            if (matched[i].id == this._currentCompanyId) {
                company = matched[i];
                break;
            }
        }

        this._current = 0;

        BEM.DOM.update(this.elem('companies'), this.__self.getCompaniesHtml(matched, this._currentCompanyId));
        BEM.DOM.update(this._suggest, this.__self.getSuggestHtml(company, {
            name: this._val,
            employees: this._values,
            isMulti: this._isMulti
        }));

        window.setTimeout(function() {
            _this.__scroller = _this._suggest.mCustomScrollbar();
        }, 0);
    },

    _getMatchedEmployee: function() {

        if (!this._val.length) return this._data;

        var res = [],
            _this = this,
            val = _this._val.toLowerCase();

        $.each(this._data, function(nc, company) {
            var matchedDepartments = [];

            $.each(company.departments, function(nd, dep) {
                var matchedEmployees = [];

                $.each(dep.employees, function(ne, emp) {
                    var name = emp.fullName.toLowerCase(),
                        words = name.split(' '),
                        matchFlag = false;

                    words.push(name);

                    words.forEach(function(w) {
                        w.indexOf(val) || (matchFlag = true)
                    });

                    matchFlag && matchedEmployees.push(emp);
                });

                matchedEmployees.length && matchedDepartments.push({
                    name: dep.name,
                    id: dep.id,
                    employees: matchedEmployees
                });
            });

            res.push({
                name: company.name,
                id: company.id,
                departments: matchedDepartments
            });
        });

        this._current = 0;

        return res;
    },

    inputVal: function(val) {

        if (typeof val == 'undefined') return this._val;

        if (this._val != val) {
            this._input.val() != val && this._input.val(val);
            this._val = val;
            this.trigger('change');
        }

        return this;
    },

    _getEmployeeById: function(id) {
        var data = this._employees;

        for (var i = 0, l = data.length; i < l; i++) {
            if (data[i].id == id) return data[i];
        }

        return null;
    },

    _focus: function() {

        var input = this.elem('input')[0];
        if (input.createTextRange && !input.selectionStart) {
            var range = input.createTextRange();
            range.move('character', input.value.length)
            range.select();
        } else {
            input.focus();
        }

    },

    getSelectedItemId: function(node) {
        return this.getMod($(node), 'id');
    }

},
{
   live: function() {
       this
           .liveBindTo('input', 'focusin', function() {
               this._showSuggest(true);
           })

           .liveBindTo('employee', 'mousedown', function(e) {
               this.selectEmployee(this.getMod(e.data.domElem, 'id'));
           })

           .liveBindTo('department-name', 'mousedown', function(e) {
               var depDom = e.data.domElem.parent(),
                   hasSelected = $('.b-employees-combobox__employee_select_yes', depDom).length;

               this.toggleMod(depDom, 'expand', 'on', 'off');

               $('.b-employees-combobox__employees-list', depDom).slideToggle(200, hasSelected && function() {
                   this._scrollToCurrent();
               }.bind(this));

               hasSelected && this._moveCursor('down');
           })

           .liveBindTo('company', 'mousedown', function(e) {
               this._currentCompanyId = this.getMod(e.data.domElem, 'id');
               this._refreshSuggest();
           })

           .liveBindTo('cancel-selected', 'mousedown', function(e) {
               this.cancelSelected(this.getMod(e.data.domElem.parent(), 'id'));
           })
   },

    // TODO use templates
    getCompaniesHtml: function(list, cidCurrent) {
        var htmlBuf = '',
            cls = 'b-employees-combobox__company';

        $.each(list, function(nc, company) {
            var cnt = 0;

            $.each(company.departments, function(nd, dep) {
                cnt += dep.employees.length
            });

            htmlBuf +=
                '<li class="' + cls + ' ' + cls + '_id_' + company.id + (cidCurrent == company.id ? ' ' + cls + '_select_yes' : '') + '">' +
                    '<span class="b-employees-combobox__company-matched">' + cnt + '</span>' +
                    '<span class="b-employees-combobox__company-name">' + company.name + '</span>' +
                    '<i class="b-employees-combobox__arrow"></i>' +
                '</li>';
        });

        return htmlBuf;
    },

    // TODO use templates
    getSuggestHtml: function(company, options) {

        var empCls = 'b-employees-combobox__employee';

        if (!company || !company.departments.length) {
            return '<div class="b-employees-combobox__not-found">' +
                'По запросу ' +
                '<span  class="b-employees-combobox__search-string">&laquo;' +
                options.name + '&raquo;</span>' +
                ' поиск не дал результатов' +
                '</div>';
        }

        var htmlBuf = '<ul class="b-employees-combobox__departments-list content">';

        $.each(company.departments, function(nd, dep) {

            if (!dep.employees) return;

            htmlBuf +=
                '<li class="b-employees-combobox__department b-employees-combobox__department_expand_on">' +
                    '<div class="b-employees-combobox__department-name">' + dep.name + '</div>' +
                        '<ul class="b-employees-combobox__employees-list">';

            $.each(dep.employees, function(ne, emp) {

                if (options.employees && options.employees.indexOf(emp.id.toString()) !== -1) {
                    return;
                }

                var name = emp.fullName;

                if (options.name) {

                    var optionsName = options.name.toLowerCase(),
                        upperFirstLetters = function (text) {
                        return text
                            .split(' ')
                            .map(function (word, index) {
                                return word.substr(0, 1).toUpperCase() + word.substr(1);
                            })
                            .join(' ')
                    };

                    name = name
                        .toLowerCase()
                        .split(optionsName)
                        .map(function (word, index) {
                            return index == 0 ?
                                (word.length ?
                                    upperFirstLetters(word) + '<strong>' + optionsName + '</strong>' :
                                    '<strong>' + upperFirstLetters(optionsName) + '</strong>'
                                ) :
                                word;
                        })
                        .join('');
                }

                htmlBuf +=
                    '<li class="' + empCls + ' ' + (ne === 0 && nd === 0 ? empCls + '_select_yes ' : '') + empCls + '_id_' + emp.id + '">' +
                        '<img src="' + emp.avatarUrl + '" height="32px" width="32px" />' +
                        '<div class="b-employees-combobox__employee-info">' +
                            '<div class="b-employees-combobox__employee-name">' + name + '</div>' +
                            '<div class="b-employees-combobox__employee-pos" title="' + emp.position + '">' + emp.position + '</div>' +
                        '</div>' +
                    '</li>';
            });
            htmlBuf += '</ul></li>';
        });
        htmlBuf += '</ul></li>';

        return htmlBuf + '</ul>';
    },

    // TODO use templates
    getSelectedItemHtml: function(employee, options) {

        var name = employee.fullName;

        if (options.isMulti) {
            name = [
                employee.name.substr(0, 1),
                employee.surname
            ].join('. ')
        }

        return '<li class="b-employees-combobox__selected-item' + ' b-employees-combobox__selected-item_id_' + employee.id + '">' +
            '<img src="' + employee.avatarUrl + '" height="18px" width="18px" />' +
            '<span class="b-employees-combobox__selected-item-name">' + name + '</span>' +
            '<div class="b-employees-combobox__cancel-selected"></div>' +
        '</li>';
    }
});
