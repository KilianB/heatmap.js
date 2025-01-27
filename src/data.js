var Store = (function StoreClosure() {
  var Store = function Store(config) {
    this._coordinator = {};
    this._data = [];
    this._radi = [];
    this._min = 10;
    this._max = 1;
    this._xField = config['xField'] || config.defaultXField;
    this._yField = config['yField'] || config.defaultYField;
    this._valueField = config['valueField'] || config.defaultValueField;

    if (config['radius']) {
      this._cfgRadius = config['radius'];
    }
  };

  var defaultRadius = HeatmapConfig.defaultRadius;

  Store.prototype = {
    // when forceRender = false -> called from setData, omits renderall event
    _organiseData: function (dataPoint, forceRender) {
      var x = dataPoint[this._xField];
      var y = dataPoint[this._yField];
      var radi = this._radi;
      var store = this._data;
      var max = this._max;
      var min = this._min;
      var value = dataPoint[this._valueField] || 1;
      var radius = dataPoint.radius || this._cfgRadius || defaultRadius;

      if (!store[x]) {
        store[x] = [];
        radi[x] = [];
      }

      if (!store[x][y]) {
        store[x][y] = value;
        radi[x][y] = radius;
      } else {
        store[x][y] += value;
      }
      var storedVal = store[x][y];

      if (storedVal > max) {
        if (!forceRender) {
          this._max = storedVal;
        } else {
          this.setDataMax(storedVal);
        }
        return false;
      } else if (storedVal < min) {
        if (!forceRender) {
          this._min = storedVal;
        } else {
          this.setDataMin(storedVal);
        }
        return false;
      } else {
        return {
          x: x,
          y: y,
          value: value,
          radius: radius,
          min: min,
          max: max,
        };
      }
    },
    _unOrganizeData: function () {
      var unorganizedData = [];
      var data = this._data;
      var radi = this._radi;

      for (var x in data) {
        for (var y in data[x]) {
          unorganizedData.push({
            x: x,
            y: y,
            radius: radi[x][y],
            value: data[x][y],
          });
        }
      }
      return {
        min: this._min,
        max: this._max,
        data: unorganizedData,
      };
    },
    _onExtremaChange: function () {
      this._coordinator.emit('extremachange', {
        min: this._min,
        max: this._max,
      });
    },

    _removeData: function (dataPoint, minDeletionThreshold) {
      const x = dataPoint[this._xField];
      const y = dataPoint[this._yField];
      const store = this._data;
      const max = this._max;
      const min = this._min;
      const value = dataPoint[this._valueField] || 1;
      const radius = dataPoint.radius || this._cfgRadius || defaultRadius;

      if (!store[x]) {
        //Nothing to do
        return {
          renderAllRequired: false,
          abort: true,
        };
      }

      if (!store[x][y]) {
        //Nothing to do. Value does not exist
        return {
          renderAllRequired: false,
          abort: true,
        };
      } else {
        //Do we want to remove a datapoint or just reduce it's value?
        //We could use a countmap to see if the value is 0.

        const prevValue = store[x][y];

        store[x][y] -= value;

        const reducedValue = store[x][y];

        console.log(this._max + " " + prevValue);

        if (reducedValue <= minDeletionThreshold) {
          //Assume the data point as deleted.
          delete store[x][y];

          if (prevValue === min || prevValue === max) {
            //We deleted the min / max value. Recomputation needed
            return {
              recomputeExtrema: true,
              point: {
                x,
                y,
                radius,
                value: Number.MIN_VALUE,
              },
            };
          } else {
            return {
              recomputeExtrema: false,
              point: {
                x,
                y,
                radius,
                value: Number.MIN_VALUE,
              },
            };
          }
        } else {
          //Value was not deleted just reduced

          if (reducedValue < min || prevValue === max) {
            //We reduced the max value or created a new min value.
            //Recomputation needed.
            return {
              recomputeExtrema: true,
              point: {
                x,
                y,
                radius,
                value: reducedValue,
              },
            };
          } else {
            return {
              recomputeExtrema: false,
              point: {
                x,
                y,
                radius,
                min,
                max,
                value: reducedValue,
              },
            };
          }
        }
      }
    },

    addData: function () {
      if (arguments[0].length > 0) {
        var dataArr = arguments[0];
        var dataLen = dataArr.length;
        while (dataLen--) {
          this.addData.call(this, dataArr[dataLen]);
        }
      } else {
        // add to store
        var organisedEntry = this._organiseData(arguments[0], true);
        if (organisedEntry) {
          // if it's the first datapoint initialize the extremas with it
          if (this._data.length === 0) {
            this._min = this._max = organisedEntry.value;
          }
          this._coordinator.emit('renderpartial', {
            min: this._min,
            max: this._max,
            data: [organisedEntry],
          });
        }
      }
      return this;
    },
    setData: function (data) {
      var dataPoints = data.data;
      var pointsLen = dataPoints.length;

      // reset data arrays
      this._data = [];
      this._radi = [];

      if (data.calculateExtrema) {
        this._max = typeof data.max === 'number' ? data.max : Number.MIN_VALUE;
        this._min = typeof data.min === 'number' ? data.min : Number.MAX_VALUE;
      }

      for (var i = 0; i < pointsLen; i++) {
        this._organiseData(dataPoints[i], false);
      }

      //Original behaviour. Override values by supplied data
      if (!data.calculateExtrema) {
        this._max = data.max;
        this._min = data.min || 0;
      }

      this._onExtremaChange();
      this._coordinator.emit('renderall', this._getInternalData());
      return this;
    },

    removeData: function (data, redraw = true, adjustExtrema = false, minDeletionThreshold = 0) {
      let recomputeExtremaRequired = false;

      if (data.length > 0) {
        let dataLen = data.length;
        while (dataLen--) {
          //We do not recursively call this function as this will result
          //in unnecessary rerenders if we have multiple extrema shifts.

          //If we could partially rerender
          if (this._removeData(data, minDeletionThreshold).recomputeExtrema) {
            recomputeExtremaRequired = true;
          }
        }
      } else {
        const newDataPoint = this._removeData(data, minDeletionThreshold);

        //No data was present which could have been deleted
        if (newDataPoint.abort) {
          return;
        }
        recomputeExtremaRequired = newDataPoint.recomputeExtrema;
      }

      //An extrema shift has happened.
      if (recomputeExtremaRequired && adjustExtrema) {
        //out array can have holes in it!!!
       
        const { min, max } = this._computeExtrema();

        let fullRerenderRequired = false;

        if (this._min != min) {
          this._min = min;
          fullRerenderRequired = true;
        }
        if (this._max != max) {
          this._max = max;
          fullRerenderRequired = true;
        }

        if (fullRerenderRequired) {
          this._onExtremaChange();
        } /*else {
        //TODO we might need to create a custom clear rect value vall.
        //This has the issue if we have overlapping values which we need to draw...

        //Only  partial rerender required.

        //How do we clear a single pixel?
        //Do we really need to rerender everything?
        // this._coordinator.emit('renderpartial', {
        //   min: this._min,
        //   max: this._max,
        //   data: [newDataPoint.point],
        // });
      }
      } else {
        //this._coordinator.emit('renderall', this._getInternalData());
        //We can not partially rerender the canvas as data points are overlapped.
        // this._coordinator.emit('renderpartial', {
        //   min: this._min,
        //   max: this._max,
        //   data: [newDataPoint.point],
        // });
      }*/
      }
      if (redraw) {
        this._coordinator.emit('renderall', this._getInternalData());
      }
      return this;
    },
    setDataMax: function (max) {
      this._max = max;
      this._onExtremaChange();
      this._coordinator.emit('renderall', this._getInternalData());
      return this;
    },
    setDataMin: function (min) {
      this._min = min;
      this._onExtremaChange();
      this._coordinator.emit('renderall', this._getInternalData());
      return this;
    },
    setCoordinator: function (coordinator) {
      this._coordinator = coordinator;
    },

    _computeExtrema: function () {
      let min = Number.MAX_VALUE;
      let max = Number.MIN_VALUE;

      for (let i = 0; i < this._data.length; i++) {
        if (this._data[i]) {
          for (let j = 0; j < this._data[i].length; j++) {
            if (this._data[i][j]) {
              if (this._data[i][j] > min) {
                min = this._data[i][j];
              }
              if (this._data[i][j] < max) {
                max = this._data[i][j];
              }
            }
          }
        }
      }
      return {
        min,
        max,
      };
    },

    _getInternalData: function () {
      return {
        max: this._max,
        min: this._min,
        data: this._data,
        radi: this._radi,
      };
    },
    getData: function () {
      return this._unOrganizeData();
    } /*,

      TODO: rethink.

    getValueAt: function(point) {
      var value;
      var radius = 100;
      var x = point.x;
      var y = point.y;
      var data = this._data;

      if (data[x] && data[x][y]) {
        return data[x][y];
      } else {
        var values = [];
        // radial search for datapoints based on default radius
        for(var distance = 1; distance < radius; distance++) {
          var neighbors = distance * 2 +1;
          var startX = x - distance;
          var startY = y - distance;

          for(var i = 0; i < neighbors; i++) {
            for (var o = 0; o < neighbors; o++) {
              if ((i == 0 || i == neighbors-1) || (o == 0 || o == neighbors-1)) {
                if (data[startY+i] && data[startY+i][startX+o]) {
                  values.push(data[startY+i][startX+o]);
                }
              } else {
                continue;
              } 
            }
          }
        }
        if (values.length > 0) {
          return Math.max.apply(Math, values);
        }
      }
      return false;
    }*/,
  };

  return Store;
})();
