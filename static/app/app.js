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
    $scope.ethAccountBalance;
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
      $scope.etherBankAddress = '0x2cb144e31f37e7a31d6fb54881b2958aa263b6df';
      var etherBankInstance = web3.eth.contract(etherBankAbi);
      $scope.etherBankContract = etherBankInstance.at($scope.etherBankAddress);

      var etherDollarkAddress = '0xe11bbC8306afD3e2DB1a91E2edE6cFb44efbFc61';
      var etherDollarInstance = web3.eth.contract(etherDollarAbi);
      $scope.etherDollarContract = etherDollarInstance.at(etherDollarkAddress);
      $scope.getLoans();
      $scope.defaultAccountAddress = web3.eth.defaultAccount.slice(0, 15) + ' ... ' + web3.eth.defaultAccount.slice(-15);

      $scope.etherBankContract.etherPrice(function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.etherPrice = result.c[0] / 100;
          $scope.ethToEtdProportion = $scope.etherPrice / $scope.etdPrice;
          $scope.$applyAsync();
        }
      });

      $scope.etherBankContract.collateralRatio(function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.minRatio = result.c[0] / 1000;
          $scope.$applyAsync();
        }
      });

      web3.eth.getBalance(web3.eth.defaultAccount, function(error, result) {
        if (result) {
          $scope.ethAccountBalance = result.c[0] / 10 ** 4;
        } else {
          console.log(error);
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

      $scope.maxLoan = $scope.collateralAmount * $scope.etherPrice / $scope.minRatio / $scope.etdPrice;
      if ($scope.maxLoan) {
        $scope.maxLoan = $scope.maxLoan.toFixed(2);
      }
      $scope.showAlert = false;

      if ($scope.collateralAmount > $scope.ethAccountBalance) {
        $scope.alertMessage = 'Exceeds the ETH in your account';
        $scope.showAlert = true;
      }

      $scope.currentRatio = $scope.collateralAmount * $scope.etherPrice / $scope.loanAmount / $scope.etdPrice;

      if ($scope.currentRatio < $scope.minRatio) {
        $scope.alertMessage = 'Insufficient ETH for the Requested Loan';
        $scope.showAlert = true;
      }

      if ($scope.currentRatio) {
        $scope.currentRatio = $scope.currentRatio * 100;
        $scope.currentRatio = $scope.currentRatio.toFixed(2);
      }

      if (!$scope.loanAmount || !$scope.collateralAmount || $scope.currentRatio === Infinity
          || $scope.currentRatio === -Infinity) {
            $scope.deactiveGetLoan = true;
      }

    };

    $scope.getCurrentLoanState = function() {
      $scope.getEtdBalance();
      $scope.etherBankContract.loans.call($scope.selectedLoan.loanId, {
        from: web3.eth.defaultAccount
      }, function(error, result) {
        if (result) {
          var loanState = result[3].c[0];
          var currentCollateral = result[1].c[0] / 10 ** 4;
          var remainingDebt = result[2].c[0] / 10 ** 2;
          var liquidationPrice = $scope.minRatio * remainingDebt / currentCollateral;
          var collateralRatio = currentCollateral * $scope.etherPrice / remainingDebt / $scope.etdPrice;
          var securityMargin = .0001; // It's for rounding the decimals to keep ratio upper than minimum.
          if (loanState == 3) {
            securityMargin = 0;
            collateralRatio = 0;
            liquidationPrice = 0;
          }
          if (loanState == 0) {
            loanState = 'Active';
          } else if (loanState == 1) {
            loanState = 'Under Liquidation';
          } else if (loanState == 2) {
            loanState = 'Liquidated';
          } else if (loanState == 3) {
            loanState = 'Settled';
          }
          var maxCollateralToWithdraw = $scope.minRatio * remainingDebt * $scope.etdPrice / $scope.etherPrice;
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
      var loansGot = $scope.etherBankContract.LoanGot({
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

      $scope.etherBankContract.getLoan.sendTransaction($scope.loanAmount * 100, {
        value: web3.toWei($scope.collateralAmount, "ether"),
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
      $scope.projectedRatio = projectedCollateral * $scope.etherPrice / $scope.selectedLoan.remainingDebt /
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

      if ($scope.increaseAmount > $scope.ethAccountBalance) {
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

      var checkSettleLonResult = function(hashString) {
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
                checkSettleLonResult(hashString);
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
        $scope.etherBankContract.settleLoan.sendTransaction($scope.selectedLoan.loanId, $scope.paybackAmount *
          100, {
            value: 0,
            sender: web3.eth.defaultAccount
          },
          function(error, result) {
            if (result) {
              var hashString = result;
              checkSettleLonResult(hashString);
            } else {
              console.log(error);
            }
          });
      };

      var sendApproveTransaction = function() {
        $scope.etherDollarContract.approve.sendTransaction($scope.etherBankAddress, $scope.paybackAmount *
          100, {
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
      $scope.etherBankContract.increaseCollateral.sendTransaction($scope.selectedLoan.loanId, {
        value: web3.toWei($scope.increaseAmount, "ether"),
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
        $scope.etherBankContract.decreaseCollateral.sendTransaction($scope.selectedLoan.loanId, web3.toWei(
          $scope.decreaseAmount, "ether"), {
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
                decreaseTransaction();
              }
            }
          }
        })
      };

      var approveDecrease = function() {
        $scope.etherDollarContract.decreaseApproval.sendTransaction($scope.etherBankAddress, web3.toWei(
          $scope.decreaseAmount, "ether"), {
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

      approveDecrease();
    };

    $scope.getEtdBalance = function() {
      $scope.etherDollarContract.balanceOf(web3.eth.defaultAccount, function(error, result) {
        if (error) {
          console.log(error);
        } else {
          $scope.etdAccountbalance = result.c[0] / 10 ** 2;
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