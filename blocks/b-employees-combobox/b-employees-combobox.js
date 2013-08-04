BEM.DOM.decl('b-employees-combobox', {

    onSetMod: {

        'js': function() {

            var _this = this;

            this.params = $.extend({
                defaultPlaceholder: 'Initiator',
                activePlaceholder: 'Search',
                valueName: 'combobox',
                noFound: 'Поиск по фразе %s не дал результатов'
            }, this.params);

            this._data = this.params.data;

            this._input = this.elem('input');

            this._suggest = this.elem('suggest');

            this._companies = this.elem('companies');

            this._dropdown = this.elem('dropdown');

            this._initData();

            this._isMulti = this.hasMod('multi');

            this._values = [];

            this._initValues();

            this.setMod(this._input, 'status', 'inactive');

            this._val = this._input.val();

            this._current = 0;

            this._currentCompanyId = this._data[0].id;

            this._preventHide = false;

            this._initEvents();

            this._initDropdown();

            setInterval(function() { _this.inputVal(_this._input.val()) }, 200);

            this._refreshSuggest();
        }

    },

    onElemSetMod: {
        input: {
            status: function(input, modName, modVal) {
                input.attr('placeholder', modVal === 'active' ?
                    this.params.activePlaceholder :
                    this.params.defaultPlaceholder)
            }
        }
    },

    _initDropdown: function() {

        var wrapper = this.elem('selected-items'),
            position = wrapper.offset(),
            width = wrapper.outerWidth(true),
            height = wrapper.outerHeight(true);

        $(document.body).append(this._dropdown);

        this._dropdown.css({
            top: (position.top + height) + 'px',
            left: position.left,
            width: width
        });



    },

    _initValues: function() {

        var _this = this;

        this.elem('value').attr('name', this.params.valueName);

        (this.params.value || '').split(',').filter(function(val) { return !!val; })
            .forEach(function(value) {
                if (-1 !== value.indexOf('d')) {
                    _this.selectDepartment(value.replace('d', ''));
                } else if (-1 !== value.indexOf('e')) {
                    _this.selectEmployee(value.replace('e', ''));
                }
            });

        _this._updateInputStyle();
    },

    _initData: function() {
        var _this = this,
            employees = this._employees = [],
            departments = this._departments = [],
            departamentIteration = function(department) {

                if (department.employees.length) {
                    $.each(department.employees, function(ne, emp) { employees.push(emp) });
                }

                if (department.departments.length) {
                    $.each(department.departments, function(nc, childDepartment) {
                        departamentIteration(childDepartment);
                    });
                }
            };

        $.each(this._data, function(nc, company) {
            $.each(company.departments, function(nd, dep) {
                departments.push(dep);
                departamentIteration(dep);
            });
        });
    },

    _initEvents: function() {

        var _this = this;

        this.on('change', function() {

            // update input style
            _this._updateInputStyle();

            // refresh Suggest
            _this._refreshSuggest();
        });

        this
            .bindTo(this._input, 'focus', function() {
                this.setMod(this.elem('input'), 'status', 'active');
                this._showSuggest(true);
            })
            .bindTo(this._input, 'blur', function() {
                this.setMod(this.elem('input'), 'status', 'inactive');
                this.afterCurrentEvent(function() { _this._hideSuggest() });
            })
            .bindTo(this._input, 'keypress', function(e) {
                if (e.keyCode == 13) {
                    _this.selectEmployee(_this.getMod(_this.findElem(_this._dropdown, 'employee', 'select', 'yes'), 'id'));
                    _this._isMulti && _this._input.focus();
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
                    case 27:
                        _this._reset();
                        break;
                    default:
                        this._showSuggest();
                }
            });

        this.bindTo(this._dropdown, 'mousedown', function(event) {

            var target = $(event.target),
                company = target.parents(_this.buildSelector('company')),
                employee = target.parents(_this.buildSelector('employee'));

            if (company.size()) {
                _this._currentCompanyId = _this.getMod(company, 'id');
                _this._refreshSuggest();
                _this._preventHide = true;
            } else if (employee.size()) {
                _this.selectEmployee(_this.getMod(employee, 'id'));
                _this._isMulti && (_this._preventHide = true);
            } else if (target.hasClass('b-employees-combobox__department') || target.hasClass('b-employees-combobox__department-name')) {
                var depDom = target.hasClass('b-employees-combobox__department') ? target : target.parent(),
                    hasSelected = $('.b-employees-combobox__employee_select_yes', depDom).length;

                //            @todo Закомментировал до лучших времен
                //            if (_this._isMulti) {
                //                _this.selectDepartment(_this.getMod(depDom, 'id'));
                //                return;
                //            }

                _this.toggleMod(depDom, 'expand', 'on', 'off');

                var empList = $('.b-employees-combobox__employees-list:first', depDom);

                empList.slideToggle(200, function() {
                    var childDepartments = $('.b-employees-combobox__department', depDom);

                    if (empList.filter(":hidden").size()) {
                        childDepartments.hide();
                        this.setMod(childDepartments, 'expand', 'off');
                    } else {
                        childDepartments.show();
                        this.setMod(childDepartments, 'expand', 'on');
                    }

                    // update scroller
                    this.__scroller.scrollbar();

                    hasSelected && this._scrollToCurrent();

                }.bind(_this));

                hasSelected && _this._moveCursor('down');

                _this._preventHide = true;
            } else {
                _this._preventHide = true;
            }
        });
    },

    _scrollToCurrent: function(current) {
        current || (current = this.findElem(this._dropdown, 'employee').eq(this._current));

        if (current.length) {
            this.__scroller.scrollbar({
                scrollTo: this.__scroller.data('scrollbar').content.scrollTop() + current.position().top - 25
            });
        }
    },

    _showSuggest: function(scrollOff) {

        var _this = this,
            position = this.elem('item-input').offset(),
            wrapper = this.elem('item-input').parent(),
            parentPosition = wrapper.offset(),
            width = wrapper.outerWidth(true),
            height = this.elem('item-input').outerHeight(true);

        this.setMod(this.elem('item-input'), 'selected', 'yes');

        this._dropdown
            .css({
                top: (position.top + height) + 'px',
                left: parentPosition.left,
                width: width + 'px'
            })
            .fadeIn(200, function () {

                _this.__scroller && _this._suggest.scrollbar();

                !scrollOff && _this._scrollToCurrent();
            });
    },

    _hideSuggest: function() {
        if (this._preventHide) {
            this._preventHide = false;
            this.elem('input').focus();
        } else {
            this.setMod(this.elem('item-input'), 'selected', 'no');
            this._dropdown.fadeOut(200);
        }
    },

    selectDepartment: function(id, silent) {

        if (!id) return false;

        id = id.toString();

        if (-1 === this._values.indexOf(id + 'd'))
            this._values.push(id + 'd');
        else
            return false;

        var _this = this,
            departamentIteration = function(department) {
                if (_this._values.indexOf(department.id.toString() + 'd') !== -1) {
                    department.departments.length && removeDepartments(department.departments);
                    department.employees.length && removeEmployees(department.employees);
                } else if (department.departments.length) {
                    $.each(department.departments, function(nc, childDepartment) {
                        departamentIteration(childDepartment);
                    });
                }
            },
            removeDepartments = function(departments) {
                $.each(departments, function(c, departament) {

                    var depPos = _this._values.indexOf(departament.id + 'd');

                    if (depPos !== -1) {
                        // remove child dep
                        _this._values.splice(depPos, 1);
                        _this.findElem('selected-item', 'id-dep', departament.id.toString()).remove();
                    }
                });
            },
            removeEmployees = function(employees) {
                $.each(employees, function(c, employee) {
                    var employeePos = _this._values.indexOf(employee.id + 'e');
                    if (employeePos !== -1) {
                        _this._values.splice(employeePos, 1);
                        _this.findElem('selected-item', 'id', employee.id.toString()).remove();
                    }
                });
            };

        $.each(this._data, function(nc, company) {
            if (company.id != _this._currentCompanyId) {
                return;
            }
            $.each(company.departments, function(nc, department) {
                departamentIteration(department);
            });
        });

        this._renderValues();

        this.elem('input').val('');

        this.params.onSelect && this.params.onSelect(id, 'department');

        $(this.getSelectedDepartmentItemHtml(this._getDepartmentById(id), {
            isMulti: this._isMulti,
            position: this._values.length
        }))
            .insertBefore(this.elem('item-input'));

        silent || this.trigger('change');

        return true;
    },

    selectEmployee: function(id, silent) {
        if (!id) return false;

        var _this = this,
            emp = this._getEmployeeById(id);

        if (!emp) return false;

        if (this._isMulti) {
            if (-1 === this._values.indexOf(id + 'e'))
                this._values.push(id + 'e');
            else
                return false;
        } else {
            this._values = [id + 'e'];
        }

        this._renderValues();

        this.elem('input').val('');

        this.params.onSelect && this.params.onSelect(id, 'employee');

        $(this.getSelectedItemHtml(emp, {
                isMulti: this._isMulti,
                position: this._values.length
            }))
            .insertBefore(this.elem('item-input'));

        this._isMulti || this.elem('item-input').hide();

        this._isMulti || this._hideSuggest();

        silent || this.trigger('change');

        return true;
    },

    _removeEmployee: function(id) {

        if (this._isMulti) {
            this._values = this._values.filter(function (item) { return item != id + 'e' });
        } else {
            this._values = [];
        }

        this._renderValues();

        this.trigger('change');
    },

    cancelEmployeeSelected: function(id) {

        this._removeEmployee(id);

        this.findElem('selected-item', 'id', id).remove();

        if (!this._isMulti) {
            this.elem('item-input').show();
        }

        this.elem('input').focus();
    },

    cancelDepartmentSelected: function(id) {

        this._values = this._values.filter(function (item) { return item != id + 'd' });

        this._renderValues();

        this.trigger('change');

        this.findElem('selected-item', 'id-dep', id).remove();

        this.elem('item-input').show();

        this.elem('input').focus();
    },

    _moveCursor: function(direction) {

        var items = $('.b-employees-combobox__employee', this._dropdown),
            current = this._current,
            length = items.length;

        if (length <= 1) return;

        this.setMod(items.eq(current), 'select', 'no');

        this._current = direction == 'down' ?
            current == length - 1 ? 0 : current + 1 :
            current == 0 ? length - 1 : current - 1;

        var next = items.eq(this._current),
            nextDep = next.parent().parent();

        // поиск не схлопнутого отдела для активного пункта
        if (this.hasMod(nextDep, 'expand', 'off')) {

            var deps = $('.b-employees-combobox__department', this._suggest),
                currentIndex = deps.index(nextDep),
                counter = currentIndex;

            do {
                counter = direction == 'down' ?
                    counter == deps.length - 1 ? 0 : counter + 1 :
                    counter == 0 ? deps.length - 1 : counter - 1;
            } while (this.hasMod(deps.eq(counter), 'expand', 'off') && counter != currentIndex)

            var nextDepChild = $('.b-employees-combobox__employees-list:first', deps.eq(counter)).children();

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
            activeCompany = null,
            company;

        $.each(matched, function(nc, company) {
            if (company.id == _this._currentCompanyId && company.cnt > 0) {
                activeCompany = _this._currentCompanyId;
                return false;
            }
        });

        activeCompany || $.each(matched, function(nc, company) {
            if (company.cnt > 0) {
                activeCompany = company.id;
                return false;
            }
        });

        this._currentCompanyId = activeCompany || this._currentCompanyId;

        for (var i = 0, l = matched.length; i < l; i++) {
            if (matched[i].id == this._currentCompanyId) {
                company = matched[i];
                break;
            }
        }

        this._current = 0;

        BEM.DOM.update(this._companies, this.getCompaniesHtml(matched, this._currentCompanyId));
        BEM.DOM.update(this._suggest, this.getSuggestHtml(company, {
            name: this._val,
            selectedValues: this._values,
            isMulti: this._isMulti
        }));

        _this.__scroller = _this._suggest.scrollbar({ forceUpdate: true });
    },

    /**
     * [
     *   company
     *          ->
     * ]
     * @return {*}
     * @private
     */
    _getMatchedEmployee: function() {

        var res = [],
            _this = this,
            val = _this._val && _this._val.toLowerCase(),
            getMatchedDepartments = function(departments) {
                var matchedDepartments = [],
                    cntEmployees = 0,
                    childDepartments = null;
                $.each(departments, function(nd, dep) {
                    var matchedEmployees = [];
                    if (_this._values.indexOf(dep.id + 'd') !== -1) {
                        return matchedDepartments;
                    }
                    $.each(dep.employees, function(ne, emp) {

                        if (_this._values.indexOf(emp.id + 'e') !== -1) {
                            return;
                        }

                        var name = emp.fullName.toLowerCase(),
                            words = name.split(' '),
                            matchFlag = false;

                        if (val) {


                            words.push(name);

                            words.forEach(function(w) {
                                (-1 !== w.indexOf(val)) && (matchFlag = true)
                            });

                        } else {
                            matchFlag = true;
                        }

                        matchFlag && matchedEmployees.push(emp);
                    });

                    cntEmployees += (matchedEmployees.length || 0);

                    childDepartments = dep.departments.length && getMatchedDepartments(dep.departments);
                    $.each(childDepartments, function(ncd, childDep) {
                        cntEmployees += (childDep.cntEmployees || 0);
                    });

                    (matchedEmployees.length || childDepartments.length) && matchedDepartments.push({
                        name: dep.name,
                        id: dep.id,
                        departments: childDepartments,
                        employees: matchedEmployees,
                        cntEmployees: cntEmployees
                    });
                });
                return matchedDepartments;
            };

        $.each(this._data, function(nc, company) {
            var matchedDepartments,
                cntEmployees = 0;

            matchedDepartments = getMatchedDepartments(company.departments);
            $.each(matchedDepartments, function(md, dep) {
                cntEmployees += (dep.cntEmployees || 0);
            });

            res.push({
                name: company.name,
                id: company.id,
                departments: matchedDepartments,
                cnt: cntEmployees
            });
        });

        this._current = 0;

        return res;
    },

    _renderValues: function() {
        console.log();
        this.elem('value').val(this._values.join(','));
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

    getValue: function() {
        return this._values.join(',');
    },

    setValue: function(value) {
        console.log('set values');
        var _this = this,
            values = (value || '').split(',').filter(function(val) { return !!val; }),
            success = true;

        this._clear();

        values.forEach(function(value) {
            if (-1 !== value.indexOf('d')) {
                if (!_this.selectDepartment(value.replace('d', ''), true)) {
                    success = false;
                }
            } else if (-1 !== value.indexOf('e')) {
                if (!_this.selectEmployee(value.replace('e', ''), true)) {
                    success = false;
                }
            }
        });

        if (!success) {
            this.elem('item-input').show();
        }

        this._updateInputStyle();

        this.trigger('change');
    },

    _getEmployeeById: function(id) {
        var data = this._employees,
            searchEmployee = function (emp) {

                var employee = null;

                if (emp.id == id) {
                    employee = emp;
                } else if (emp.departments.length) {
                    $.each(dep.departments, function(nc, childDep) {
                        department = searchDepartment(childDep);
                        if (department) return false;
                    });
                }
                return department;
            };

        for (var i = 0, l = data.length; i < l; i++) {
            if (data[i].id == id) return data[i];
        }

        return null;
    },

    _getDepartmentById: function(id) {
        var data = this._departments,
            department = null,
            searchDepartment = function (dep) {

                var department = null;

                if (dep.id == id) {
                    department =  dep;
                } else if (dep.departments.length) {
                    $.each(dep.departments, function(nc, childDep) {
                        department = searchDepartment(childDep);
                        if (department) return false;
                    });
                }
                return department;
            };
        $.each(data, function(nc, dep) {
            department = searchDepartment(dep);
            if (department) return false;
        });

        return department;
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

    _clear: function() {
        this._values = [];

        this.elem('value').val('');

        this.findElem('selected-item').remove();
    },

    _reset: function() {

        this._clear();

        this._hideSuggest();

        this.findElem('input').blur();

        this.trigger('change');
    },

    _updateInputStyle: function() {

    },

    getSelectedItemId: function(node) {

        var id = this.getMod($(node), 'id');

        if (!id) {
            id = this.getMod($(node), 'id-dep');

            if (!id) {
                return null;
            }
            return id + 'd';
        }

        return id + 'e';
    },

    getCompaniesHtml: function(list, cidCurrent) {
        var htmlBuf = '',
            cls = 'b-employees-combobox__company';

        $.each(list, function(nc, company) {

            htmlBuf +=
                '<li class="' + cls + ' ' + cls + '_id_' + company.id + (cidCurrent == company.id ? ' ' + cls + '_select_yes' : '') + '">' +
                    '<span class="b-employees-combobox__company-matched">' + company.cnt + '</span>' +
                    '<span class="b-employees-combobox__company-name">' + company.name + '</span>' +
                    '<i class="b-employees-combobox__arrow"></i>' +
                    '</li>';
        });

        return htmlBuf;
    },

    getSuggestHtml: function(company, options) {

        if (!company || !company.departments.length) {
            return '<div class="b-employees-combobox__not-found">' +
                this.params.noFound.replace('%s', options.name) +
                '</div>';
        }

        var depListCls = 'b-employees-combobox__departments-list',
            htmlBuf = '<ul class="' + depListCls + '">',
            renderDepartmentsList = function(departments, level) {

                var depHtml = '';

                level = level || 0;

                $.each(departments, function(nd, dep) {

                    var depCls = 'b-employees-combobox__department';

                    depHtml += '<li class="' + depCls + ' ' + depCls + '_expand_on ' + depCls + '_id_' + dep.id + '">';

                    // department name
                    depHtml += '<div class="b-employees-combobox__department-name">' + dep.name + '</div>';

                    // employees
                    if (dep.employees) {
                        depHtml += '<ul class="b-employees-combobox__employees-list">';
                        $.each(dep.employees, function(ne, emp) {

                            var name = emp.fullName,
                                empCls = 'b-employees-combobox__employee';

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

                            depHtml += '<li class="' + empCls + ' ' + (level === 0 && ne === 0 && nd === 0 ? empCls + '_select_yes ' : '') + empCls + '_id_' + emp.id + '">';
                            depHtml += '<img src="' + emp.avatarUrl + '" height="32px" width="32px" />' +
                                            '<div class="b-employees-combobox__employee-info">' +
                                            '<div class="b-employees-combobox__employee-name">' + name + '</div>' +
                                            '<div class="b-employees-combobox__employee-pos" title="' + emp.position + '">' + emp.position + '</div>' +
                                            '</div>';
                            depHtml += '</li>';
                        });
                        depHtml += '</ul>';
                    }

                    // child departments
                    if (dep.departments && dep.departments.length) {
                        depHtml += '<ul class="' + depListCls + ' ' + depListCls + '_type_child">';
                        depHtml += renderDepartmentsList(dep.departments, ++level);
                        depHtml += '</ul>';
                    }

                    // close
                    depHtml += '</li>';
                });

                return depHtml;
            };


        htmlBuf += renderDepartmentsList(company.departments);
        htmlBuf += '</ul>';

        return htmlBuf;
    },

    getSelectedItemHtml: function(employee, options) {

        var name = employee.fullName;

        if (options.isMulti) {
            name = [
                employee.name.substr(0, 1),
                employee.surname
            ].join('. ')
        }

        return '<li class="b-employees-combobox__selected-item' + ' b-employees-combobox__selected-item_id_' + employee.id + '">' +
                (this.beforeSelectedItemHtml ? this.beforeSelectedItemHtml() : '') +
                '<img src="' + employee.avatarUrl + '" height="18px" width="18px" />' +
                '<span class="b-employees-combobox__selected-item-name" title="' + employee.fullName + '">' + name + '</span>' +
                '<div class="b-employees-combobox__cancel-selected"></div>' +
                (this.afterSelectedItemHtml ? this.afterSelectedItemHtml() : '') +
                '</li>';
    },

    beforeSelectedItemHtml: function() {
        return '';
    },

    afterSelectedItemHtml: function() {
        return '';
    },

    getSelectedDepartmentItemHtml: function(department, options) {
        var cls = 'b-employees-combobox__selected-item';

        return '<li class="' + cls + ' ' + cls + '_type_department ' + cls + '_id-dep_' + department.id + '">' +
            '<span class="' + cls + '-name" title="' + department.name + '">' + department.name + '</span>' +
            '<div class="b-employees-combobox__dep-cancel-selected"></div>' +
            '</li>';
    }
},
{
   live: function() {
       this
           .liveBindTo('cancel-selected', 'click', function(e) {
               this.cancelEmployeeSelected(this.getMod($(e.target).parents(this.buildSelector('selected-item')), 'id'));
           })
           .liveBindTo('dep-cancel-selected', 'mousedown', function(e) {
               this.cancelDepartmentSelected(this.getMod($(e.target).parents(this.buildSelector('selected-item')), 'id-dep'));
           });

       return false;
   }
});
