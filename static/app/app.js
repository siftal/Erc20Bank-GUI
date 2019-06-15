(function() {
  'use strict';
  var app = angular.module('etherBank', ['ui.router']);

  app.controller('getLoanCtl', function($scope, $location, $timeout, $anchorScroll, $state, $window) {

    // Hide submenus
    $('#body-row .collapse').collapse('hide');

    // Collapse/Expand icon
    $('#collapse-icon').addClass('fas fa-angle-double-right');

    // Collapse click
    $('[data-toggle=sidebar-colapse]').click(function() {
      SidebarCollapse();
    });

    $(function () {
      $('[data-toggle="tooltip"]').tooltip();
    });

    $scope.currentPage = {
      getLoan: true,
      confirm: false,
      dashboard: false
    };

    $scope.collateralAmount;
    $scope.loanAmount;
    $scope.collateralBalance;
    $scope.maxLoan;
    $scope.alertMessage;
    $scope.currentRatio;
    $scope.liquidationPrice;
    $scope.paybackAmount;
    $scope.etdPrice = 1;
    $scope.showAlert = false;
    $scope.projectedLiquidationPrice = '--';
    $scope.projectedRatio = '--';
    $scope.deactiveGetLoan = true;

    $scope.operatorAlert = {
      payback: false,
      increase: false,
      decrease: false
    };

    var SidebarCollapse = function() {
      $('.menu-collapsed').toggleClass('d-none');
      $('.sidebar-submenu').toggleClass('d-none');
      $('.submenu-icon').toggleClass('d-none');
      $('#sidebar-container').toggleClass('sidebar-collapsed sidebar-expanded');

      // Treating d-flex/d-none on separators with title
      var SeparatorTitle = $('.sidebar-separator-title');
      if (SeparatorTitle.hasClass('d-flex')) {
        SeparatorTitle.removeClass('d-flex');
      } else {
        SeparatorTitle.addClass('d-flex');
      }

      // Collapse/Expand icon
      $('#collapse-icon').toggleClass('fas fa-angle-double-right fas fa-angle-double-left');
    };

    window.addEventListener('load', async () => {

      if (typeof web3 === 'undefined') {
        Swal.fire({
          type: 'error',
          title: 'MetaMask is not installed',
          text: 'Please install MetaMask from below link',
          footer: '<a href="https://metamask.io">Install MetaMask</a>'
        });
        return;
      }

      web3.eth.getAccounts(function(err, accounts) {
        if (err != null) {
          Swal.fire({
            type: 'error',
            title: 'Something wrong',
            text: 'Check this error: ' + err,
            footer: ''
          });
        }
      });


      if (window.ethereum) {
        window.web3 = new Web3(ethereum);
        try {
          Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;
          await ethereum.enable();
          $scope.init();
        } catch (error) {
          Swal.fire({
            type: 'error',
            title: 'Something wrong',
            text: 'User denied account access...',
          });
        }
      } else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider);
      } else {
        Swal.fire({
          type: 'error',
          title: 'Something wrong',
          text: 'You should consider trying MetaMask!',
        });
      }

    });

    $scope.init = function() {
      web3.eth.defaultAccount = web3.eth.accounts[0];
      $scope.erc20BankAddress = erc20BankAddress;
      var erc20BankInstance = web3.eth.contract(erc20BankAbi);
      $scope.erc20BankContract = erc20BankInstance.at($scope.erc20BankAddress);

      var collateralInstance = web3.eth.contract(collateralAbi);
      $scope.collateralContract = collateralInstance.at(collateralAddress);

      var etherDollarInstance = web3.eth.contract(etherDollarAbi);
      $scope.etherDollarContract = etherDollarInstance.at(etherDollarkAddress);
      $scope.getLoans();
      $scope.defaultAccountAddress = web3.eth.defaultAccount.slice(0, 15) + ' ... ' + web3.eth.defaultAccount.slice(-15);

      $scope.erc20BankContract.collateralPrice(function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.collateralPrice = result.c[0] / 10 ** 4;
          $scope.ethToEtdProportion = $scope.collateralPrice / $scope.
          etdPrice;
          $scope.$applyAsync();
        }
      });

      $scope.erc20BankContract.collateralRatio(function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.minRatio = result.c[0] / 1000;
          $scope.$applyAsync();
        }
      });

      $scope.erc20BankContract.collateralPrice(function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.collateralPrice = result.c[0] / 10 ** 4;
          $scope.ethToEtdProportion = $scope.collateralPrice / $scope.etdPrice;
          $scope.$applyAsync();
        }
      });

      $scope.collateralContract.balanceOf(web3.eth.defaultAccount, function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.collateralBalance = result.c[0] / 10 ** 4;
        }
      });

    };

    $scope.isNan = function(item) {
      return isNaN(item);
    };

    $scope.getLoanLimitation = function() {
      $scope.deactiveGetLoan = false;

      $scope.liquidationPrice = $scope.minRatio * $scope.loanAmount / $scope.collateralAmount;
      if ($scope.liquidationPrice) {
        $scope.liquidationPrice = $scope.liquidationPrice.toFixed(2);
      }

      $scope.maxLoan = $scope.collateralAmount * $scope.collateralPrice / $scope.minRatio / $scope.etdPrice;
      if ($scope.maxLoan) {
        $scope.maxLoan = $scope.maxLoan.toFixed(2);
      }
      $scope.showAlert = false;

      if ($scope.collateralAmount > $scope.collateralBalance) {
        $scope.alertMessage = 'Exceeds the collateral in your account';
        $scope.showAlert = true;
      }

      $scope.currentRatio = $scope.collateralAmount * $scope.collateralPrice / $scope.loanAmount / $scope.etdPrice;

      if ($scope.currentRatio < $scope.minRatio) {
        $scope.alertMessage = 'Insufficient collateral for the Requested Loan';
        $scope.showAlert = true;
      }

      if ($scope.currentRatio) {
        $scope.currentRatio = $scope.currentRatio * 100;
        $scope.currentRatio = $scope.currentRatio.toFixed(2);
      }

      if (!$scope.loanAmount || !$scope.collateralAmount || $scope.currentRatio === Infinity || $scope.currentRatio === -Infinity) {
            $scope.deactiveGetLoan = true;
      }

    };

    $scope.getCurrentLoanState = function() {
      $scope.getEtdBalance();
      $scope.erc20BankContract.loans.call($scope.selectedLoan.loanId, {
        from: web3.eth.defaultAccount
      }, function(error, result) {
        if (result) {
          var loanState = result[3].c[0];
          var currentCollateral = result[1].c[0] / 10 ** 4;
          var remainingDebt = result[2].c[0] / 10 ** 4;
          var liquidationPrice = $scope.minRatio * remainingDebt / currentCollateral;
          var collateralRatio = currentCollateral * $scope.collateralPrice / remainingDebt / $scope.etdPrice;
          var securityMargin = .0001; // It's for rounding the decimals to keep ratio upper than minimum.
          if (loanState == 3) {
            securityMargin = 0;
            collateralRatio = 0;
            liquidationPrice = 0;
          }
          if (loanState == 0) {
            loanState = 'Undefined';
          } else if (loanState == 1) {
            loanState = 'Active';
          } else if (loanState == 2) {
            loanState = 'Under Liquidation';
          } else if (loanState == 3) {
            loanState = 'Liquidated';
          } else if (loanState == 4) {
            loanState = 'Settled';
          }
          var maxCollateralToWithdraw = $scope.minRatio * remainingDebt * $scope.etdPrice / $scope.collateralPrice;
          maxCollateralToWithdraw = currentCollateral - (maxCollateralToWithdraw + securityMargin);
          remainingDebt = remainingDebt.toFixed(2);
          currentCollateral = currentCollateral.toFixed(4);
          collateralRatio = (collateralRatio * 100).toFixed(2);
          liquidationPrice = liquidationPrice.toFixed(2);
          maxCollateralToWithdraw = maxCollateralToWithdraw.toFixed(4);
          $scope.selectedLoan.loanState = loanState;
          $scope.selectedLoan.remainingDebt = remainingDebt;
          $scope.selectedLoan.currentCollateral = currentCollateral;
          $scope.selectedLoan.liquidationPrice = liquidationPrice;
          $scope.selectedLoan.collateralRatio = collateralRatio;
          $scope.selectedLoan.maxCollateralToWithdraw = maxCollateralToWithdraw;
          $scope.$applyAsync();
        } else {
          console.log(error);
        }
      });
    };

    $scope.getLoans = function() {
      $scope.loansList = [];
      var loansGot = $scope.erc20BankContract.LoanGot({
        recipient: web3.eth.defaultAccount
      }, {
        fromBlock: 0,
        toBlock: 'latest'
      });
      loansGot.get(function(error, result) {
        if (error) {
          console.log(error);
          return;
        } else {
          result.forEach(function(loan) {
            var loanId = loan.args.loanId.c[0];
            var thisLoan = {loanId: loanId};
            $scope.loansList.push(thisLoan);
          });
          $scope.selectedLoan = $scope.loansList[$scope.loansList.length - 1];
          if ($scope.selectedLoan) {
            $scope.getCurrentLoanState();
          }
          $scope.$applyAsync();
        }
      });
    };

    $scope.$watch('selectedLoan', function() {
      if ($scope.selectedLoan) {
        $scope.getCurrentLoanState();
      }
    });

    $scope.loanOrderSubmission = function() {
      $scope.currentPage.getLoan = false;
      $scope.currentPage.confirm = true;
      $anchorScroll('body-row');
    };

    $scope.loanOrderConfirmation = function() {

      var checkTransactionResult = function(hashString, waitingMessage) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start(waitingMessage);
                waiting.isActive = true;
              }
              $timeout(function() {
                checkTransactionResult(hashString, waitingMessage);
              }, 3000);
            } else {
              if (result.status == '0x1') {
                $timeout(function() {
                  waiting.stop();
                  waiting.isActive = false;
                  $location.path('/dashboard');
                  for (var page in $scope.currentPage) {
                    $scope.currentPage[page] = false;
                    if (page == 'dashboard') {
                      $scope.currentPage[page] = true;
                    }
                  };
                }, 12000);
              }
            }
          }
        });
      };

      var sendGetLoanTransaction = function(){
        $scope.erc20BankContract.getLoan.sendTransaction($scope.loanAmount * 10**18, {
          value: 0,
          sender: web3.eth.defaultAccount
        }, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            var hashString = result;
            var waitingMessage = 'Please wait!';
            checkTransactionResult(hashString, waitingMessage);
          }
        });
      };

      var checkApproveResult = function(hashString) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start('Please wait. We are approving your request!');
                waiting.isActive = true;
              }
              $timeout(function() {
                checkApproveResult(hashString);
              }, 5000);
            } else {
              if (result.status == '0x1') {
                waiting.stop();
                waiting.isActive = false;
                sendGetLoanTransaction();
              }
            }
          }
        })
      };

      var sendApproveTransaction = function() {
        $scope.collateralContract.approve.sendTransaction($scope.erc20BankAddress, $scope.collateralAmount * 10**18, {
            value: 0,
            sender: web3.eth.defaultAccount
          },
          function(error, result) {
            if (result) {
              var hashString = result;
              checkApproveResult(hashString);
            } else {
              console.log(error);
            }
          });
      };

      sendApproveTransaction();

    };

    $scope.backPage = function() {
      $scope.currentPage.getLoan = true;
      $scope.currentPage.confirm = false;
    };

    $scope.$watch($state.current.name, function() {
      for (var page in $scope.currentPage) {
        $scope.currentPage[page] = false;
      };
      if ($state.current.name == 'loan') {
        $scope.currentPage.getLoan = true;
      } else if ($state.current.name == 'dashboard') {
        $scope.currentPage.dashboard = true;
      }
    });

    $scope.$on('$locationChangeSuccess', function(event) {
      $window.location.reload();
    });

    $scope.operatorPanel = {
      display: false,
      deposit: false,
      withdraw: false,
      payback: false
    };

    $scope.changeOperator = function(operator) {
      for (var item in $scope.operatorPanel) {
        if (item == 'display' || item == operator) {
          $scope.operatorPanel[item] = true;
        } else {
          $scope.operatorPanel[item] = false;
        }
      }
    };

    $scope.cancelOperator = function() {
      $scope.operatorPanel.display = false;
    };

    $scope.newLoan = function() {
      $location.path('/');
    };


    $scope.limitaions = function(operator) {
      if (operator == 'increase') {
        var projectedCollateral = Number($scope.selectedLoan.currentCollateral) + $scope.increaseAmount;
      }
      if (operator == 'decrease') {
        var projectedCollateral = Number($scope.selectedLoan.currentCollateral) - $scope.decreaseAmount;
      }
      $scope.projectedLiquidationPrice = $scope.minRatio * $scope.selectedLoan.remainingDebt /
        projectedCollateral;
      $scope.projectedRatio = projectedCollateral * $scope.collateralPrice / $scope.selectedLoan.remainingDebt /
        $scope.etdPrice;
      $scope.projectedLiquidationPrice = $scope.projectedLiquidationPrice.toFixed(2);
      $scope.projectedRatio = ($scope.projectedRatio * 100).toFixed(2);
      if ($scope.paybackAmount > $scope.selectedLoan.remainingDebt || $scope.paybackAmount < 0) {
        $scope.operatorAlert.payback = true;
        $scope.alertMessage = 'Exceeds your loan amount';
      } else if ($scope.paybackAmount < 0) {
        $scope.operatorAlert.payback = true;
        $scope.alertMessage = 'Invalud Input';
      } else if ($scope.paybackAmount > $scope.etdAccountbalance) {
        $scope.operatorAlert.payback = true;
        $scope.alertMessage = 'Insuffient ETD';
      } else {
        $scope.operatorAlert.payback = false;
      }

      if ($scope.increaseAmount > $scope.collateralBalance) {
        $scope.operatorAlert.increase = true;
        $scope.alertMessage = 'Exceeds ETH in your account';
      } else if ($scope.increaseAmount < 0) {
        $scope.operatorAlert.increase = true;
        $scope.alertMessage = 'Invalid Input';
      } else {
        $scope.operatorAlert.increase = false;
      }

      if ($scope.decreaseAmount > $scope.selectedLoan.maxCollateralToWithdraw) {
        $scope.operatorAlert.decrease = true;
        $scope.alertMessage = 'Exceeds MAX collateral to withdraw';
      } else {
        $scope.operatorAlert.decrease = false;
      }
    };

    var waiter = function() {
      this.start = function(message) {
        $('.someBlock').preloader({
          text: message,
        });
      };

      this.stop = function() {
        $('.someBlock').preloader('remove');
      };

      this.isActive = false;
    };
    var waiting = new waiter();

    $scope.paybackLoan = function() {

      var checkSettleLoanResult = function(hashString) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start('Please wait. We are settling your loan!');
                waiting.isActive = true;
              }
              $timeout(function() {
                checkSettleLoanResult(hashString);
              });
            } else {
              if (result.status == '0x1') {
                $timeout(function() {
                  $scope.getCurrentLoanState();
                  waiting.stop();
                  waiting.isActive = false;
                }, 8000);
              }
            }
          }
        })
      };

      var checkApproveResult = function(hashString) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start('Please wait. We are approving your request!');
                waiting.isActive = true;
              }
              $timeout(function() {
                checkApproveResult(hashString);
              }, 5000);
            } else {
              if (result.status == '0x1') {
                waiting.stop();
                waiting.isActive = false;
                sendSettleLoanTransaction();
              }
            }
          }
        })
      };

      var sendSettleLoanTransaction = function() {
        $scope.erc20BankContract.settleLoan.sendTransaction($scope.selectedLoan.loanId, $scope.paybackAmount * 10**18, {
            value: 0,
            sender: web3.eth.defaultAccount
          },
          function(error, result) {
            if (result) {
              var hashString = result;
              checkSettleLoanResult(hashString);
            } else {
              console.log(error);
            }
          });
      };

      var sendApproveTransaction = function() {
        $scope.etherDollarContract.approve.sendTransaction($scope.erc20BankAddress, $scope.paybackAmount * 10**18, {
            value: 0,
            sender: web3.eth.defaultAccount
          },
          function(error, result) {
            if (result) {
              var hashString = result;
              checkApproveResult(hashString);
            } else {
              console.log(error);
            }
          });
      };

      sendApproveTransaction();

    };

    var checkTransactionResult = function(hashString, waitingMessage) {
      web3.eth.getTransactionReceipt(hashString, function(error, result) {
        if (error) {
          console.log(error);
        } else {
          if (result == null) {
            if (waiting.isActive == false) {
              waiting.start(waitingMessage);
              waiting.isActive = true;
            }
            $timeout(function() {
              checkTransactionResult(hashString, waitingMessage);
            }, 3000);
          } else {
            if (result.status == '0x1') {
              $timeout(function() {
                $scope.getCurrentLoanState();
                waiting.stop();
                waiting.isActive = false;
              }, 8000);
            }
          }
        }
      });
    };

    $scope.increaseCollateral = function() {

      var senIncreaseTransaction = function(){
        $scope.erc20BankContract.increaseCollateral.sendTransaction($scope.selectedLoan.loanId, {
          value: 0,
          sender: web3.eth.defaultAccount
        }, function(error, result) {
          if (result) {
            var hashString = result;
            var waitingMessage = 'We are increasing your collateral, Please wait!';
            checkTransactionResult(hashString, waitingMessage);
          } else {
            console.log(error);
          }
        });
      }

      var checkApproveResult = function(hashString) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start('Please wait. We are approving your request!');
                waiting.isActive = true;
              }
              $timeout(function() {
                checkApproveResult(hashString);
              }, 5000);
            } else {
              if (result.status == '0x1') {
                waiting.stop();
                waiting.isActive = false;
                senIncreaseTransaction();
              }
            }
          }
        })
      };

      var approveIncrease = function() {
        $scope.collateralContract.approve.sendTransaction($scope.erc20BankAddress, $scope.increaseAmount * 10**18, {
          value: 0,
          sender: web3.eth.defaultAccount
        }, function(error, result) {
          if (result) {
            var hashString = result;
            checkApproveResult(hashString);
          } else {
            console.log(error);
          }
        });
      };

      approveIncrease();

    };

    $scope.decreaseCollateral = function() {

      var checkDecreaseResult = function(hashString) {
        web3.eth.getTransactionReceipt(hashString, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            if (result == null) {
              if (waiting.isActive == false) {
                waiting.start('Please wait. We are settling your loan!');
                waiting.isActive = true;
              }
              $timeout(function() {
                checkDecreaseResult(hashString);
              });
            } else {
              if (result.status == '0x1') {
                $timeout(function() {
                  $scope.getCurrentLoanState();
                  waiting.stop();
                  waiting.isActive = false;
                }, 8000);
              }
            }
          }
        })
      };

      var decreaseTransaction = function() {
        $scope.erc20BankContract.decreaseCollateral.sendTransaction($scope.selectedLoan.loanId, $scope.decreaseAmount * 10**18, {
          sender: web3.eth.defaultAccount
        }, function(error, result) {
          if (result) {
            var hashString = result;
            checkDecreaseResult(hashString);
          } else {
            console.log(error);
          }
        });
      };

      decreaseTransaction();
    };

    $scope.getEtdBalance = function() {
      $scope.etherDollarContract.balanceOf(web3.eth.defaultAccount, function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.etdAccountbalance = result.c[0] / 10 ** 4;
        }
      });
    };

    $scope.setMaxPaybackAmount = function() {
      if ($scope.selectedLoan.remainingDebt <= $scope.etdAccountbalance) {
        $scope.paybackAmount = Number($scope.selectedLoan.remainingDebt);
      } else if (Number($scope.selectedLoan.remainingDebt) < $scope.etdAccountbalance) {
        $scope.paybackAmount = $scope.etdAccountbalance;
      }
    };

    $scope.setMaxCollateralToWithdraw = function() {
      $scope.decreaseAmount = Number($scope.selectedLoan.maxCollateralToWithdraw);
    };

  });

  app.config(function($stateProvider) {
    var loanState = {
      name: 'loan',
      url: '/',
      templateUrl: 'templates/home.html',
      controller: 'getLoanCtl'
    };

    var dashboardState = {
      name: 'dashboard',
      url: '/dashboard',
      templateUrl: 'templates/home.html',
      controller: 'getLoanCtl'
    };
    $stateProvider.state(loanState);
    $stateProvider.state(dashboardState);
  });

})();
