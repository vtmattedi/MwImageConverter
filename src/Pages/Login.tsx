import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeSelector from "@/components/ThemeSelector";

import { ShieldOff } from "lucide-react";
import { defaultUser, useGlobals } from "@/Providers/Globals";
import { useAlert } from "@/Providers/Alerts";
import { useNavigate } from "react-router-dom";
const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    //Unfort. no errors to test, using _ to avoid lint error
    // uncomment to test
    // const [errors, _setErrors] = useState<string[]>(["Credenciais inválidas"]);
    const [errors, _setErrors] = useState<string[]>([]);
    const { showAlert } = useAlert();
    const { setUser, onMobile, theme } = useGlobals();
    const navigate = useNavigate();
    // const TrackFyLogo = {
    //     inverted: 'https://trackfyapp.com.br/images/logo/logo-cor-2.svg',
    //     normal: 'https://trackfyapp.com.br/images/logo/logo-trackfy.svg'
    // }
    // Fake login handler

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate an API call
        setTimeout(() => {
            setLoading(false);
            // Display error since we don't have a real backend
            showAlert(
                <div className="flex items-center"><ShieldOff className="mr-2" />Serviço Indisponível</div>,
                <div>Este serviço está temporariamente indisponível. Tente utilizar a <strong>conta de demonstração</strong> ou entre em contato com o suporte.</div>,
                () => { }
            );

        }, 1000);

    };


    const { user } = useGlobals();
    useEffect(() => {
        if (user) {
            // If a user is already logged in, redirect to home
            navigate('/');
        }
    }, [user]);
    return (
        <div className="flex min-h-screen items-center justify-center bg-blue-900 w-[100vw] dark:bg-gray-900"

            style={{
                background: `
                linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), 
                linear-gradient(to top, rgba(30, 58, 138, 0.7), rgba(30, 58, 138, 0)),
                url(/bg01.webp)
                `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexDirection: onMobile ? 'column' : 'row',

            }}
        >
            {
                !onMobile ? (
                    <div className="max-w-[80vw] w-[100%] min-h-screen pt-0   backdrop-blur-[2px] h-[100vh] ">

                        <div className="text-center mb-8 px-4 flex flex-col justify-center h-[100%]">

                        </div>
                    </div>
                )
                    : <></>

            }
            <Card className={ !onMobile ? "w-full max-w-md shadow-lg min-h-screen  backdrop-blur-md justify-center":""}
                style={{
                    borderTopRightRadius: onMobile ? undefined : 0,
                    borderBottomRightRadius: onMobile ? undefined : 0,
                    width: onMobile ? '90%' : undefined,
                }}>
                <CardHeader >
                    {/* {onMobile && <h1 className="text-2xl  mb-4 text-center font-lato font-[300] "> Trackfy Dashboard App </h1>} */}
                    {/* Only available during the project evaluation period */}
                    {<img className="w-64 mx-auto mb-2" src={theme === "dark" ? "https://trackfyapp.com.br/images/logo/logo-cor-2.svg" : "https://trackfyapp.com.br/images/logo/logo-trackfy.svg"} alt="Trackfy Logo" />}
                    <div className="flex justify-between items-center font-lato text-xl mt-2">
                        <CardTitle>Login </CardTitle>
                        <ThemeSelector />
                    </div>
                </CardHeader>
                <CardContent className="font-inter">
                    <form onSubmit={handleSubmit} className={onMobile ? "space-y-4" : "space-y-6"}>
                        <div>
                            <label htmlFor="email" className="block mb-1 text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            
                        </div>
                        <div>
                            <label htmlFor="password" className="block mb-1 text-sm font-medium">
                                Senha
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        {errors.length > 0 && (
                            <div className="bg-red-100 text-red-700 p-2 rounded text-sm font-sm ">
                                <ul className="list-disc list-inside">
                                    {errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))
                                    }
                                </ul>
                            </div>
                        )}
                        <Button type="submit" className="w-full bg-[var(--color-accent-trackfy)] hover:bg-[var(--color-accent-trackfy-hover)]" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>
                    <hr className="my-6" />
                    <Button variant="outline" className="w-full" disabled>
                        <img className="w-6" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEy0lEQVR4nO2ZbUwbZQDHL45M5vygycRkL0YFlWw9oHdFYSsr69uItBksIYwOwiC8KKwq4EAY8TYYsoG8CIOFCduCzmiTQbveNSC4q7p9chlkEo0fTIxrC2uPFzcXoC885sggdYP2bj1ajP0n/y9N7+nvd9fnuadXCAommGB8DsBEIdMVaB5VjBDWTPTOuFIwNy4TuCx7Y4FFGAss+wQLEwp09q4KNdsK+QNUKT8XYFAIFOj8VQ7HUQXIDUsS6jTHxwI2tcgFTlsecmO6KjrG/+DVgjeoPPS2JUHACnpFEWEssB1BRmeOo+F+gZ/6EGk2SwQLvoI/JiIWuGY+QE6vGThoittky0F+4Rrc/EhtOcgIwNI2cgo/0wk/b1UhE2sNb37YaTW/lTN4cFEUak1Hrf6CpwoQEuIyVD7ys9/g8zmGny5B2lhNRDnqpPKRm1Ml/OqpkzGiexi65X5ZVJjtGCyhSmMwKhcZpZfPVc68kVP4mVo03CITuJiCT5UgXUwmnxlDn7Ed5V9yF6G4hqczqUZ+YgJvPYyY7tfxXmQ7Pr3uWzOQ8TWBB9/v2jE/DM9PlfGBebfHJe8W0EAboPUWBwmfdhhhQPfvc9FgXPL4HdeaiZrWJTzQpG2wG3mmJQG6c7ooYFWhbt95gZMqid4GrcfYjbx4d/jlXoPBvbqYxb3LpBrphtZr7Ea4akWBh31wIXoCqJOehtZr7CR8xZOAwwi3sRnvhXwj4KrJVT1/eP1Ah5E35lGAjEoKlMBbpd/Mev1AOwlPehKYJXdGBErgtWLCxURg3pMAIHc+GyiBbYXD4H8hMOlJYO6HqNcDJRBRRCz8xyexhtEk7vOyjLYHSuDt4z0mBgK8ytXg717jg1pc9qBJk7YJ4jiNvWWbee/pnJ4E3q1v0DMQgONWgh8ZfhNk6RRA0Z8CWgziC1wLqM/Ud3u7AjXtFSqvAwEAPWU38u4sgduNMOgfEIIU7YFFeLqHdQpnx0DCDq7g61sqXo4s1rs8wUcexZ0YiTF7mucwwvU0/AwZDWpw+TK4eyuuyi0kKfL58SBGYiHJlT0Wb2c/p7b1OuNBAQlv/21YYM/TJa8Iv9QTuGzUFwmMxELSsY4xb/BbC78DNZ99hLIavA6XjnqCX74Serml+9vdW9nCdw3teSm/sfZ3JqtP2sedY2zHh3SDCa9kahUuJhKZOoWzjUjswS5mh3obt3dQtrkFl3yu0ipcqX2p4OCpVo/w4UWGBexTjNXNczkdhLhZyUDAXaROLx05axBjXxEJ4iuD8WGXSdGWHsMeYbshseYELr9Jv8f9GGVfKshqxkBYAbmiQMGpxk7Il9QTkhGmAr40u+t9sP2doX/Bp1Sf/xXyNRpN2sZjuv3jfpHozQWRav0i/L7yL6gi7CyrjeOqIUnRc5V6ucUfEoe+VoGMmlYT1omFcQLvJhF6EpfdZjMnnqS1hHTEYFjD39xdhr0Nh7RKRqsTm2Zola5zRGID5I/06kQRdbj01kG37cWTNrX/wOJZvzwkfBXydy4NCtEzuPTHHG2yg/WE1Skcn+DS61/iMv//yfdoNADacB4XH2nCxfpKXPZngTZ5NkurcNFXiN4EpmuVC/Rr5Vf3mxoICdFlSMymj4GCCSYYyNf8A50RcaYC8geEAAAAAElFTkSuQmCC" alt="google-logo"></img>
                        Login com Google
                    </Button>
                    <Button variant="outline" className="w-full mt-4" disabled>
                        <img className={`w-6`}
                            style={{ filter: theme === "dark" ? "invert(1)" : "" }}
                            src="data:image/png;base64,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" alt="github--v1"></img>
                        Login com GitHub
                    </Button>
                    <Button variant="outline" className="w-full mt-4"
                        onClick={() => {
                            setUser(defaultUser);
                        }}>
                        Usar conta demo
                    </Button>
                </CardContent>
            </Card>

        </div >
    );
};

export default Login;