import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

const IMCDashboard = () => {
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [imc, setImc] = useState(null);
  const [porcentajeGraso, setPorcentajeGraso] = useState(null);

  const calcular = () => {
    const p = parseFloat(peso);
    const h = parseFloat(altura) / 100; // altura en metros
    const e = parseInt(edad);
    const s = sexo.toLowerCase();

    if (!p || !h || !e || (s !== 'm' && s !== 'f')) return;

    const imcCalc = p / (h * h);
    let porcentaje;

    if (s === 'm') {
      porcentaje = 1.20 * imcCalc + 0.23 * e - 16.2;
    } else {
      porcentaje = 1.20 * imcCalc + 0.23 * e - 5.4;
    }

    setImc(imcCalc.toFixed(2));
    setPorcentajeGraso(porcentaje.toFixed(2));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Calcula tu IMC</Text>

      <TextInput
        placeholder="Peso (kg)"
        keyboardType="numeric"
        style={styles.input}
        value={peso}
        onChangeText={setPeso}
      />

      <TextInput
        placeholder="Altura (cm)"
        keyboardType="numeric"
        style={styles.input}
        value={altura}
        onChangeText={setAltura}
      />

      <TextInput
        placeholder="Edad"
        keyboardType="numeric"
        style={styles.input}
        value={edad}
        onChangeText={setEdad}
      />

      <TextInput
        placeholder="Sexo (M/F)"
        style={styles.input}
        value={sexo}
        onChangeText={setSexo}
        maxLength={1}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={calcular}>
        <Text style={styles.buttonText}>CALCULAR</Text>
      </TouchableOpacity>

      {imc && porcentajeGraso && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>RESULTADOS</Text>
          <Text style={styles.resultText}>IMC: {imc}</Text>
          <Text style={styles.resultText}>Porcentaje graso: {porcentajeGraso}%</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default IMCDashboard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 82,
  },
  title: {
    fontSize: 24,
    color: '#e60404',
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'Inter_700Bold',
  },
  input: {
    width: screenWidth - 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    backgroundColor: '#e60404',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  resultCard: {
    backgroundColor: '#e60404',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: screenWidth - 40,
  },
  resultTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Inter_700Bold',
  },
  resultText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
  },
});
