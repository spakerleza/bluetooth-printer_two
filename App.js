/**
 * Created by januslo on 2018/12/27.
 */

import React, {Component} from 'react';
import {ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
    ScrollView,
    DeviceEventEmitter,
    NativeEventEmitter,
    Switch,
    TouchableOpacity,
    TextInput,
    Dimensions,
    ToastAndroid} from 'react-native';
import {BluetoothEscposPrinter, BluetoothManager, BluetoothTscPrinter} from "react-native-bluetooth-escpos-printer";
// import EscPos from "./escpos";
// import Tsc from "./tsc";
import moment from 'moment';
import axios from 'axios';

var {height, width} = Dimensions.get('window');

export default class Home extends Component {


    _listeners = [];

    constructor(props) {
        super(props);
        this.state = {
            devices: null,
            pairedDs:[],
            foundDs: [],
            bleOpend: false,
            loading: true,
            boundAddress: '',
            debugMsg: '',

            costomername: '',
            amount: '',
            contact: '',
            payoutday: '',
            agentname: '',
            done: false,
        }
    }

    componentDidMount() {//alert(BluetoothManager)
        BluetoothManager.isBluetoothEnabled().then((enabled)=> {
            this.setState({
                bleOpend: Boolean(enabled),
                loading: false
            })
        }, (err)=> {
            err
        });

        if (Platform.OS === 'ios') {
            let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
            this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
                (rsp)=> {
                    this._deviceAlreadPaired(rsp)
                }));
            this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, (rsp)=> {
                this._deviceFoundEvent(rsp)
            }));
            this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, ()=> {
                this.setState({
                    name: '',
                    boundAddress: ''
                });
            }));
        } else if (Platform.OS === 'android') {
            this._listeners.push(DeviceEventEmitter.addListener(
                BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, (rsp)=> {
                    this._deviceAlreadPaired(rsp)
                }));
            this._listeners.push(DeviceEventEmitter.addListener(
                BluetoothManager.EVENT_DEVICE_FOUND, (rsp)=> {
                    this._deviceFoundEvent(rsp)
                }));
            this._listeners.push(DeviceEventEmitter.addListener(
                BluetoothManager.EVENT_CONNECTION_LOST, ()=> {
                    this.setState({
                        name: '',
                        boundAddress: ''
                    });
                }
            ));
            this._listeners.push(DeviceEventEmitter.addListener(
                BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT, ()=> {
                    ToastAndroid.show("Device Not Support Bluetooth !", ToastAndroid.LONG);
                }
            ))
        }
    }

    componentWillUnmount() {
        //for (let ls in this._listeners) {
        //    this._listeners[ls].remove();
        //}
    }

    _deviceAlreadPaired(rsp) {
        var ds = null;
        if (typeof(rsp.devices) == 'object') {
            ds = rsp.devices;
        } else {
            try {
                ds = JSON.parse(rsp.devices);
            } catch (e) {
            }
        }
        if(ds && ds.length) {
            let pared = this.state.pairedDs;
            pared = pared.concat(ds||[]);
            this.setState({
                pairedDs:pared
            });
        }
    }

    _deviceFoundEvent(rsp) {//alert(JSON.stringify(rsp))
        var r = null;
        try {
            if (typeof(rsp.device) == "object") {
                r = rsp.device;
            } else {
                r = JSON.parse(rsp.device);
            }
        } catch (e) {//alert(e.message);
            //ignore
        }
        //alert('f')
        if (r) {
            let found = this.state.foundDs || [];
            if(found.findIndex) {
                let duplicated = found.findIndex(function (x) {
                    return x.address == r.address
                });
                //CHECK DEPLICATED HERE...
                if (duplicated == -1) {
                    found.push(r);
                    this.setState({
                        foundDs: found
                    });
                }
            }
        }
    }

    _renderRow(rows){
        let items = [];
        for(let i in rows){
            let row = rows[i];
            if(row.address) {
                items.push(
                    <TouchableOpacity key={new Date().getTime()+i} style={styles.wtf} onPress={()=>{
                    this.setState({
                        loading:true
                    });
                    BluetoothManager.connect(row.address)
                        .then((s)=>{
                            this.setState({
                                loading:false,
                                boundAddress:row.address,
                                name:row.name || "UNKNOWN"
                            })
                        },(e)=>{
                            this.setState({
                                loading:false
                            })
                            alert(e);
                        })

                }}><Text style={styles.name}>{row.name || "UNKNOWN"}</Text><Text
                        style={styles.address}>{row.address}</Text></TouchableOpacity>
                );
            }
        }
        return items;
    }


    _submitHandler() {
        this.setState({loading: true}, async () => {
            try {
                const { costomername, amount, contact, payoutday, agentname } = this.state;
                // Validate input
                // Empty field
                if (emptyValidator({ costomername, amount, contact, payoutday, agentname }).length > 0) {
                    throw Error("All fields are required");
                }
             
                this.setState({ done: true });

            } catch(e) {
                let msg = "";
                if(e.response) {
                    msg = get(e, "response.data.message");
                } else {
                    msg = e.message;
                }
               
            }
            this.setState({ loading: false })
        })
    }

    async _print(costomername, contact, amount, payoutday, agentname) {
        await BluetoothEscposPrinter.printerInit();
        await BluetoothEscposPrinter.printerLeftSpace(0);

        await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
        await BluetoothEscposPrinter.setBlob(0);
        await  BluetoothEscposPrinter.printText("E-Winnings\r\n", {});
        await BluetoothEscposPrinter.setBlob(0);
        await  BluetoothEscposPrinter.printText("Bet Slip\r\n\r\n", { });
        await  BluetoothEscposPrinter.printText(`Agent:\r\n`, {});
        await  BluetoothEscposPrinter.printText(`${ agentname }\r\n\r\n`, {});
        await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
        await  BluetoothEscposPrinter.printText(`Name: ${ costomername }\r\n`, {});
        await  BluetoothEscposPrinter.printText(`Tele: ${ contact }\r\n`, {});
        await  BluetoothEscposPrinter.printText(`Amount: ${ amount }\r\n`, {});
        await  BluetoothEscposPrinter.printText(`Payout: ${ payoutday }\r\n`, {});
        await  BluetoothEscposPrinter.printText("Date: " + (moment().format("MMMM Do YYYY, h:mm:ss a")) + "\r\n", {});
        await  BluetoothEscposPrinter.printText("--------------------------------\r\n", {});

        await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
        await BluetoothEscposPrinter.printBarCode("123456789012", BluetoothEscposPrinter.BARCODETYPE.JAN13, 3, 120, 0, 2);
        await  BluetoothEscposPrinter.printText("\r\n\r\n\r\n", {});
        await  BluetoothEscposPrinter.printText("Thanks\r\n\r\n\r\n", {});
        await  BluetoothEscposPrinter.printText("--------------------------------\r\n", {});
        await  BluetoothEscposPrinter.printText("\r\n\r\n", {});
    }

    render() {
        const { costomername, amount, contact, payoutday, agentname } = this.state;

        return (
            <ScrollView style={styles.container}>
                <Text>{this.state.debugMsg}</Text>
             
                <Text style={styles.title}>Blutooth Opended:{this.state.bleOpend?"true":"false"} <Text>Open BLE Before Scanning</Text> </Text>
                
                <View>
                <Switch value={this.state.bleOpend} onValueChange={(v)=>{
                this.setState({
                    loading:true
                })
                if(!v){
                    BluetoothManager.disableBluetooth().then(()=>{
                        this.setState({
                            bleOpend:false,
                            loading:false,
                            foundDs:[],
                            pairedDs:[]
                        });
                    },(err)=>{alert(err)});

                }else{
                    BluetoothManager.enableBluetooth().then((r)=>{
                        var paired = [];
                        if(r && r.length>0){
                            for(var i=0;i<r.length;i++){
                                try{
                                    paired.push(JSON.parse(r[i]));
                                }catch(e){
                                    //ignore
                                }
                            }
                        }
                        this.setState({
                            bleOpend:true,
                            loading:false,
                            pairedDs:paired
                        })
                    },(err)=>{
                        this.setState({
                            loading:false
                        })
                        alert(err)
                    });
                }
            }}/>
                    <Button disabled={this.state.loading || !this.state.bleOpend} onPress={()=>{
                        this._scan();
                    }} title="Scan"/>
                </View>
                <Text  style={styles.title}>Connected:<Text style={{color:"blue"}}>{!this.state.name ? 'No Devices' : this.state.name}</Text></Text>
                {
                    !this.state.name &&
                      <View>
                            <Text  style={styles.title}>Found(tap to connect):</Text>
                            { this.state.loading ? (<ActivityIndicator animating={true}/>) : null}
                            <View style={{flex:1,flexDirection:"column"}}>
                            {
                                this._renderRow(this.state.foundDs)
                            }
                            </View>
                            <Text  style={styles.title}>Paired:</Text>
                            {this.state.loading ? (<ActivityIndicator animating={true}/>) : null}
                            <View style={{flex:1,flexDirection:"column"}}>
                            {
                                this._renderRow(this.state.pairedDs)
                            }
                            </View> 
                      </View>
                }
                

                <View style={{ flex: 1,marginTop: 30, marginBottom: 30, }} >
                    <Text style={styles.title, { textAlign: "center"  }}>Enter and print customer's information</Text>
                </View>

                <View style={{ flex: 1, padding: 10 }}>
                    <View>
                        <TextInput 
                        textContentType={'name'}
                        placeholder={'Enter bettor\'s name'}
                        placeholderTextColor={'#aaa'}
                        returnKeyType='next'
                        onSubmitEditing={ () => this.contactInput.focus() }
                        style={Styles.textInput}
                        onChangeText={ (ev) => {
                            this.setState({ costomername: ev })
                        } }
                        value={this.state.costomername} />
                    </View>
                    <View>
                        <TextInput 
                        textContentType={'telephoneNumber'}
                        placeholder={'Enter bettor\'s phone number'}
                        keyboardType={'phone-pad'}
                        placeholderTextColor={'#aaa'}
                        returnKeyType='next'
                        ref={ (input) => this.contactInput = input }
                        onSubmitEditing={ () => this.amountInput.focus() }
                        style={Styles.textInput}
                        onChangeText={ (ev) => {
                            this.setState({ contact: ev })
                        } }
                        value={this.state.contact} />
                    </View>
                    <View>
                        <TextInput 
                            textContentType={'telephoneNumber'}
                            placeholder={'Enter Amount'}
                            keyboardType={'phone-pad'}
                            placeholderTextColor={'#aaa'}
                            returnKeyType='next'
                            ref={ (input) => this.amountInput = input }
                            onSubmitEditing={ () => this.payoutInput.focus() }
                            style={Styles.textInput}
                            onChangeText={ (ev) => {
                                this.setState({ amount: ev })
                            } }
                            value={this.state.amount} />
                    </View>
                    <View>
                        <TextInput 
                            textContentType={'telephoneNumber'}
                            placeholder={'Enter bettor\'s cashout day(s)'}
                            keyboardType={'phone-pad'}
                            placeholderTextColor={'#aaa'}
                            returnKeyType='next'
                            ref={ (input) => this.payoutInput = input }
                            onSubmitEditing={ () => this.agentInput.focus() }
                            style={Styles.textInput}
                            onChangeText={ (ev) => {
                                this.setState({ payoutday: ev })
                            } }
                            value={this.state.payoutday} />
                    </View>
                    <View>
                        <TextInput 
                            textContentType={'name'}
                            placeholder={'Enter your name (Agent Name)'}
                            placeholderTextColor={'#aaa'}
                            ref={ (input) => this.agentInput = input }
                            returnKeyType='done'
                            onSubmitEditing={ () =>this._submitHandler() }
                            style={Styles.textInput}
                            onChangeText={ (ev) => {
                                this.setState({ agentname: ev })
                            } }
                            value={this.state.agentname} />
                        </View>
                </View>

               
                <View style={styles.btn}>
                    <Button disabled={this.state.loading || this.state.boundAddress.length <= 0}
                        title="Print Receipt" onPress={async () => {
                            
                        try {

                            if(costomername === "" || amount === "" || contact === "" || payoutday === "" || agentname === "") {
                                throw Error("All fields are required");
                            }

                            const serverUrl = `https://astutefinance.co/server/Register/request?costomername=${costomername}&amount=${amount}&contact=${contact}&payoutday=${payoutday}&agentname=${agentname}`;

                            // const res = await axios.get(serverUrl, {
                            //     params: { costomername, amount, contact, payoutday, agentname }
                            // });
                            
                            const res = await fetch(serverUrl);

                            // const res = await axios({
                            //     method: "POST",
                            //     url: "https://astutefinance.co/server/Register/request",
                            //     data: { costomername, amount, contact, payoutday, agentname }
                            // });

                            // alert(res.data)
                            // return; 

                            await this._print(costomername, contact, amount, payoutday, agentname);

                            setTimeout( async () => {
                                await this._print(costomername, contact, amount, payoutday, agentname);
                            }, 5000);

                            this.setState({ 
                                costomername: "", 
                                amount: "", 
                                contact: "", 
                                payoutday: "" 
                            });

                        } catch (e) {
                            alert(e.message || "ERROR");
                        }

                    }}/>
                </View>
            </ScrollView>
        );
    }

    _scan() {
        this.setState({
            loading: true
        })
        BluetoothManager.scanDevices()
            .then((s)=> {
                var ss = s;
                var found = ss.found;
                try {
                    found = JSON.parse(found);//@FIX_it: the parse action too weired..
                } catch (e) {
                    //ignore
                }
                var fds =  this.state.foundDs;
                if(found && found.length){
                    fds = found;
                }
                this.setState({
                    foundDs: fds,
                    loading: false
                });
            }, (er)=> {
                this.setState({
                    loading: false
                })
                alert('error' + JSON.stringify(er));
            });
    }


}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5FCFF',
    },

    title:{
        width:width,
        backgroundColor:"#eee",
        color:"#232323",
        paddingLeft:8,
        paddingVertical:4,
        textAlign:"left"
    },
    wtf:{
        flex:1,
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center"
    },
    name:{
        flex:1,
        textAlign:"left"
    },
    address:{
        flex:1,
        textAlign:"right"
    },
    
});

const Styles = StyleSheet.create({
    textInput: {
        width: '100%',
        marginBottom: 20,
        backgroundColor: '#161a25',
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 4,
        color: '#ccccc4',
      },

      savegBtn: {
        backgroundColor: '#da9934',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        flexDirection: 'row',
    },

    saveBtnText: {
        fontWeight: '700',
        color: '#0C121E'
    },
    btnImage: {
        width: 150,
        height: 150,
        borderRadius: 150/ 2,
        alignItems: 'center',
        justifyContent: 'center'
    },  
});